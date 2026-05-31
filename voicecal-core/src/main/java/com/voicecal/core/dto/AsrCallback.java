package com.voicecal.core.dto;

/**
 * ASR回调接口
 */
public interface AsrCallback {

    /**
     * 收到识别结果时调用
     *
     * @param result 识别结果
     */
    void onResult(AsrResult result);

    /**
     * 收到部分识别结果时调用
     *
     * @param partialResult 部分识别结果
     */
    void onPartialResult(AsrResult partialResult);

    /**
     * 发生错误时调用
     *
     * @param errorCode 错误代码
     * @param errorMessage 错误信息
     */
    void onError(String errorCode, String errorMessage);

    /**
     * 识别开始时调用
     */
    void onRecognitionStart();

    /**
     * 识别结束时调用
     */
    void onRecognitionEnd();

    /**
     * 音量变化时调用
     *
     * @param volume 当前音量 (0.0 - 1.0)
     */
    default void onVolumeChanged(double volume) {
        // 默认空实现
    }
}
