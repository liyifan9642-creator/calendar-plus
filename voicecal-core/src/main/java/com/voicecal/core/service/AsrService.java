package com.voicecal.core.service;

import com.voicecal.core.dto.AsrCallback;
import com.voicecal.core.model.AsrStatus;
import com.voicecal.core.model.AudioStream;

/**
 * ASR（自动语音识别）服务接口
 */
public interface AsrService {

    /**
     * 开始语音识别
     *
     * @param stream   音频流
     * @param callback 识别结果回调
     */
    void startRecognition(AudioStream stream, AsrCallback callback);

    /**
     * 停止语音识别
     */
    void stopRecognition();

    /**
     * 获取当前识别状态
     *
     * @return ASR状态
     */
    AsrStatus getStatus();

    /**
     * 检查是否正在识别
     *
     * @return 是否正在识别
     */
    default boolean isRecognizing() {
        return getStatus().isActive();
    }
}
