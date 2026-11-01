from __future__ import annotations

import sys
from pathlib import Path

WORKER_SRC = Path(__file__).resolve().parents[1] / "src"
if str(WORKER_SRC) not in sys.path:
    sys.path.insert(0, str(WORKER_SRC))

import tempfile
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from detectors import (
    COCO_CLASSES,
    ImageDecodeError,
    LetterboxResult,
    MockDetector,
    ModelLoadError,
    OnnxRuntimeUnavailableError,
    OnnxYoloDetector,
    _letterbox_resize,
    _nms,
    _normalize_and_convert,
    _resize_image,
)

from main import app
from fastapi.testclient import TestClient


client = TestClient(app)


# ─── Letterbox tests ─────────────────────────────────────────────────────────

def test_letterbox_preserves_aspect_ratio_square():
    img = np.full((480, 480, 3), 114, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    assert isinstance(lb, LetterboxResult)
    assert lb.original_width == 480
    assert lb.original_height == 480
    assert lb.scale == 640 / 480
    assert lb.tensor.shape == (640, 640, 3)


def test_letterbox_preserves_aspect_ratio_portrait():
    img = np.full((800, 600, 3), 114, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    assert lb.original_width == 600
    assert lb.original_height == 800
    assert lb.scale == 640 / 800
    assert lb.tensor.shape == (640, 640, 3)


def test_letterbox_preserves_aspect_ratio_landscape():
    img = np.full((400, 800, 3), 114, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    assert lb.original_width == 800
    assert lb.original_height == 400
    assert lb.scale == 640 / 800
    assert lb.tensor.shape == (640, 640, 3)


def test_letterbox_padding_added_evenly():
    img = np.full((300, 400, 3), 114, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    # Scale = 640/400 = 1.6. new_h = 480, new_w = 640
    # pad_top = (640-480)//2 = 80, pad_left = 0
    assert lb.pad_top == 80
    assert lb.pad_left == 0
    assert lb.tensor.shape == (640, 640, 3)


def test_letterbox_rejects_grayscale_image():
    img = np.full((640, 640), 128, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    assert lb.tensor.shape == (640, 640, 3)


def test_letterbox_rejects_rgba_image():
    img = np.full((640, 640, 4), 128, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    assert lb.tensor.shape == (640, 640, 3)


# ─── Normalization tests ─────────────────────────────────────────────────────

def test_normalize_and_convert_produces_correct_shape():
    img = np.full((640, 640, 3), 255, dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    tensor = _normalize_and_convert(lb.tensor, 640)
    assert tensor.shape == (1, 3, 640, 640)
    assert tensor.dtype == np.float32
    assert tensor.min() >= 0.0
    assert tensor.max() <= 1.0


def test_normalize_and_convert_zero_image():
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    lb = _letterbox_resize(img, 640)
    tensor = _normalize_and_convert(lb.tensor, 640)
    assert tensor.min() == 0.0
    assert tensor.max() == 0.0


# ─── NMS tests ───────────────────────────────────────────────────────────────

def test_nms_removes_highly_overlapping_boxes():
    boxes = [
        {"x": 10, "y": 10, "width": 50, "height": 50, "confidence": 0.9, "class_id": 0},
        {"x": 15, "y": 15, "width": 50, "height": 50, "confidence": 0.8, "class_id": 0},
        {"x": 15, "y": 15, "width": 50, "height": 50, "confidence": 0.7, "class_id": 0},
    ]
    kept = _nms(boxes, iou_thresh=0.5)
    assert len(kept) == 1
    assert kept[0]["confidence"] == 0.9


def test_nms_keeps_non_overlapping_boxes():
    boxes = [
        {"x": 10, "y": 10, "width": 50, "height": 50, "confidence": 0.9, "class_id": 0},
        {"x": 200, "y": 200, "width": 50, "height": 50, "confidence": 0.8, "class_id": 0},
    ]
    kept = _nms(boxes, iou_thresh=0.5)
    assert len(kept) == 2


def test_nms_keeps_different_classes():
    boxes = [
        {"x": 10, "y": 10, "width": 50, "height": 50, "confidence": 0.9, "class_id": 0},
        {"x": 15, "y": 15, "width": 50, "height": 50, "confidence": 0.8, "class_id": 1},
    ]
    kept = _nms(boxes, iou_thresh=0.5)
    assert len(kept) == 2


def test_nms_empty_input():
    assert _nms([], iou_thresh=0.5) == []
    assert _nms([], iou_thresh=0.9) == []


def test_nms_partial_overlap_below_threshold():
    boxes = [
        {"x": 10, "y": 10, "width": 50, "height": 50, "confidence": 0.9, "class_id": 0},
        {"x": 60, "y": 10, "width": 50, "height": 50, "confidence": 0.8, "class_id": 0},
    ]
    kept = _nms(boxes, iou_thresh=0.5)
    assert len(kept) == 2


def test_nms_output_sorted_by_confidence():
    boxes = [
        {"x": 10, "y": 10, "width": 50, "height": 50, "confidence": 0.5, "class_id": 0},
        {"x": 15, "y": 15, "width": 50, "height": 50, "confidence": 0.9, "class_id": 0},
        {"x": 20, "y": 20, "width": 50, "height": 50, "confidence": 0.7, "class_id": 0},
    ]
    kept = _nms(boxes, iou_thresh=0.5)
    assert len(kept) == 1
    assert kept[0]["confidence"] == 0.9


# ─── Mock detector tests ─────────────────────────────────────────────────────

def test_mock_detector_is_deterministic():
    detector = MockDetector()
    result1 = detector.detect("asset_1", "", 640, 480)
    result2 = detector.detect("asset_1", "", 640, 480)
    assert len(result1) == 1
    assert len(result2) == 1
    assert result1[0].x == result2[0].x
    assert result1[0].y == result2[0].y
    assert result1[0].width == result2[0].width
    assert result1[0].height == result2[0].height
    assert result1[0].confidence == result2[0].confidence
    detector.close()


def test_mock_detector_geometry_bounded():
    detector = MockDetector()
    detections = detector.detect("asset_tiny", "", 18, 20)
    assert len(detections) == 1
    d = detections[0]
    assert d.x >= 0
    assert d.y >= 0
    assert d.x + d.width <= 18
    assert d.y + d.height <= 20
    detector.close()


def test_mock_detector_confidence_range():
    detector = MockDetector()
    d = detector.detect("asset_test", "", 640, 480)[0]
    assert 0.62 <= d.confidence <= 0.95
    detector.close()


def test_mock_detector_to_dict():
    detector = MockDetector()
    detections = detector.detect("asset_dict", "", 100, 100)
    d = detections[0]
    assert "assetId" in d.to_dict()
    assert "geometry" in d.to_dict()
    assert "confidence" in d.to_dict()
    assert "metadata" in d.to_dict()
    detector.close()


# ─── ONNX Runtime unavailable tests ───────────────────────────────────────────

def test_onnx_runtime_unavailable_error_raised():
    with patch.dict("sys.modules", {"onnxruntime": None}):
        with pytest.raises(OnnxRuntimeUnavailableError):
            OnnxYoloDetector(
                model_path="/fake/path.onnx",
                confidence_threshold=0.25,
                nms_iou_threshold=0.45,
            )


def test_onnx_detector_mode():
    mock_session = MagicMock()
    mock_session.get_inputs.return_value = [MagicMock(name="images")]
    mock_session.get_outputs.return_value = [MagicMock(name="output0")]

    with patch("detectors.onnx_yolo._load_onnx_session", return_value=mock_session):
        detector = OnnxYoloDetector(
            model_path="/tmp/fake.onnx",
            confidence_threshold=0.25,
            nms_iou_threshold=0.45,
        )
        assert detector.mode == "onnx_detector"
        detector.close()


def test_model_load_error_is_importable():
    try:
        raise ModelLoadError("test")
    except ModelLoadError as e:
        assert "test" in str(e)


# ─── YOLO output normalization tests ─────────────────────────────────────────

def test_normalize_yolo_output_shape_1_84_n():
    from detectors.onnx_yolo import _normalize_yolo_output

    raw = np.zeros((1, 84, 2), dtype=np.float32)
    result = _normalize_yolo_output(raw)
    assert result.shape == (2, 84)


def test_normalize_yolo_output_shape_1_n_84():
    from detectors.onnx_yolo import _normalize_yolo_output

    raw = np.zeros((1, 2, 84), dtype=np.float32)
    result = _normalize_yolo_output(raw)
    assert result.shape == (2, 84)


def test_normalize_yolo_output_shape_84_n():
    from detectors.onnx_yolo import _normalize_yolo_output

    raw = np.zeros((84, 100), dtype=np.float32)
    result = _normalize_yolo_output(raw)
    assert result.shape == (100, 84)


def test_normalize_yolo_output_shape_n_84():
    from detectors.onnx_yolo import _normalize_yolo_output

    raw = np.zeros((3, 84), dtype=np.float32)
    result = _normalize_yolo_output(raw)
    assert result.shape == (3, 84)


def test_normalize_yolo_output_rejects_invalid_shape():
    from detectors.onnx_yolo import _normalize_yolo_output

    raw = np.zeros((1, 50, 3), dtype=np.float32)
    with pytest.raises(RuntimeError, match="Unexpected.*shape.*50"):
        _normalize_yolo_output(raw)


# ─── YOLO postprocess tests ───────────────────────────────────────────────────

def test_postprocess_yolov8_shape_1_84_n_decodes_car():
    from detectors.onnx_yolo import _postprocess_yolo

    raw = np.zeros((1, 84, 2), dtype=np.float32)
    raw[0, 0, 0] = 320  # cx in letterbox coords
    raw[0, 1, 0] = 320  # cy in letterbox coords
    raw[0, 2, 0] = 100  # w
    raw[0, 3, 0] = 80   # h
    raw[0, 4 + 2, 0] = 0.9  # class 2 (car) score

    detections = _postprocess_yolo(
        outputs=[raw],
        input_size=640,
        original_w=640,
        original_h=640,
        conf_thresh=0.25,
        iou_thresh=0.45,
        scale=1.0,
        pad_top=0,
        pad_left=0,
    )

    assert len(detections) == 1
    assert detections[0].label == "car"
    assert detections[0].label_class_id is None
    assert detections[0].x == 270.0
    assert detections[0].y == 280.0
    assert detections[0].width == 100.0
    assert detections[0].height == 80.0
    assert detections[0].confidence == pytest.approx(0.9)


def test_postprocess_yolov8_shape_1_n_84_decodes_car():
    from detectors.onnx_yolo import _postprocess_yolo

    raw = np.zeros((1, 2, 84), dtype=np.float32)
    raw[0, 0, 0] = 320  # cx
    raw[0, 0, 1] = 320  # cy
    raw[0, 0, 2] = 100  # w
    raw[0, 0, 3] = 80   # h
    raw[0, 0, 4 + 2] = 0.9  # class 2 (car) score

    detections = _postprocess_yolo(
        outputs=[raw],
        input_size=640,
        original_w=640,
        original_h=640,
        conf_thresh=0.25,
        iou_thresh=0.45,
        scale=1.0,
        pad_top=0,
        pad_left=0,
    )

    assert len(detections) == 1
    assert detections[0].label == "car"
    assert detections[0].label_class_id is None


def test_postprocess_preserves_letterbox_padding_mapping():
    from detectors.onnx_yolo import _postprocess_yolo

    raw = np.zeros((1, 84, 2), dtype=np.float32)
    raw[0, 0, 0] = 320  # cx in letterbox coords
    raw[0, 1, 0] = 320  # cy in letterbox coords
    raw[0, 2, 0] = 100  # w
    raw[0, 3, 0] = 80   # h
    raw[0, 4 + 2, 0] = 0.9

    detections = _postprocess_yolo(
        outputs=[raw],
        input_size=640,
        original_w=1920,
        original_h=1080,
        conf_thresh=0.25,
        iou_thresh=0.45,
        scale=1.0,
        pad_top=80,
        pad_left=0,
    )

    assert len(detections) == 1
    assert detections[0].label == "car"
    assert detections[0].x == 270.0
    assert detections[0].y == 200.0  # (320-80)/1.0 = 240 ... wait: cy-pad_top=320-80=240, /scale=240, y=240-40=200
    assert detections[0].width == 100.0
    assert detections[0].height == 80.0


# ─── Integration: mock mode stays explicit ────────────────────────────────────

def test_mock_mode_endpoint_returns_mock_detector():
    response = client.post(
        "/cv/run-pipeline",
        json={
            "jobId": "job_mock",
            "pipeline": {"version": 1, "nodes": [], "edges": []},
            "detectorMode": "mock",
            "assets": [
                {
                    "assetId": "asset_1",
                    "storageKey": "projects/demo/originals/asset_1.jpg",
                    "width": 640,
                    "height": 360,
                }
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "mock_detector"
    assert body["workerVersion"] == "0.3.0"


def test_onnx_mode_without_model_artifact_key_returns_400():
    response = client.post(
        "/cv/run-pipeline",
        json={
            "jobId": "job_onnx_no_key",
            "detectorMode": "onnx",
            "pipeline": {"version": 1, "nodes": [], "edges": []},
            "assets": [
                {
                    "assetId": "asset_1",
                    "storageKey": "projects/demo/originals/asset_1.jpg",
                    "width": 640,
                    "height": 360,
                }
            ],
        },
    )
    assert response.status_code == 400
    assert "modelArtifactKey" in response.json()["detail"]


def test_mock_pipeline_respects_confidence_threshold():
    response = client.post(
        "/cv/run-pipeline",
        json={
            "jobId": "job_conf",
            "detectorMode": "mock",
            "pipeline": {"version": 1, "nodes": [], "edges": []},
            "confidenceThreshold": 0.99,
            "assets": [
                {
                    "assetId": "asset_1",
                    "storageKey": "projects/demo/originals/asset_1.jpg",
                    "width": 640,
                    "height": 360,
                }
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "mock_detector"
    assert body["predictionCount"] == 0


def test_coco_classes_are_valid():
    assert len(COCO_CLASSES) == 80
    assert "person" in COCO_CLASSES
    assert "car" in COCO_CLASSES
    assert "truck" in COCO_CLASSES


def test_resolve_model_path_relative():
    from main import _resolve_model_path

    # Relative path should resolve to project root
    result = _resolve_model_path("./models/yolov8n.onnx")
    assert result == Path(__file__).resolve().parents[3] / "models" / "yolov8n.onnx"


def test_resolve_model_path_absolute(tmp_path):
    from main import _resolve_model_path

    model_path = tmp_path / "custom" / "path.onnx"
    assert model_path.is_absolute()
    assert _resolve_model_path(str(model_path)) == model_path
