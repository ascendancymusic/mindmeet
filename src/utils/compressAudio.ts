import Recorder from 'opus-recorder';

/**
 * Compresses an audio file to 128k Opus format
 * @param file The audio file to compress
 * @param onProgress Optional callback for progress updates (0-100)
 * @param onDurationAvailable Optional callback that is called as soon as the audio duration is known
 * @returns A promise that resolves to an object containing the compressed file and size information
 */
export async function compressAudio(file: File, onProgress?: (progress: number) => void, onDurationAvailable?: (duration: number) => void): Promise<{
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  duration: number;
}> {
  const originalSize = file.size;

  // If the file is already small enough (less than 1MB), return it as is
  if (file.size < 1024 * 1024) {
    // Report 100% progress immediately for small files
    if (onProgress) onProgress(100);

    // For small files, we need to get the duration
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;

      // Call the duration callback if provided
      if (onDurationAvailable && duration > 0) {
        onDurationAvailable(duration);
      }

      await audioContext.close();
      return { compressedFile: file, originalSize, compressedSize: originalSize, duration };
    } catch (err) {
      console.warn('Could not determine duration for small file:', err);
      return { compressedFile: file, originalSize, compressedSize: originalSize, duration: 0 };
    }
  }

  // Start with initial progress
  if (onProgress) onProgress(10);

  try {
    // Create an audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (onProgress) onProgress(5);

    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(10);

    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // We now have the duration, report it immediately if callback provided
    if (onDurationAvailable && audioBuffer.duration > 0) {
      onDurationAvailable(audioBuffer.duration);
    }

    if (onProgress) onProgress(35);

    // Create a new Recorder instance with 128k bitrate
    const recorder = new Recorder({
      encoderApplication: 2048, // OPUS_APPLICATION_AUDIO
      encoderFrameSize: 20, // 20ms frame size
      encoderSampleRate: 48000, // Opus works best at 48kHz
      numberOfChannels: audioBuffer.numberOfChannels,
      encoderBitRate: 128000, // 128k bitrate
      streamPages: false, // We want a single file
      originalSampleRateOverride: audioContext.sampleRate
    });
    if (onProgress) onProgress(40);

    // Wait for the recorder to initialize
    await new Promise<void>((resolve) => {
      recorder.onloadedmetadata = () => {
        if (onProgress) onProgress(45);
        resolve();
      };
    });

    // Create a buffer source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Connect the source to the recorder
    const dest = audioContext.createMediaStreamDestination();
    source.connect(dest);
    if (onProgress) onProgress(48);

    // Start recording
    recorder.start();
    if (onProgress) onProgress(5);

    // Play the audio (this is needed for the recorder to capture the audio)
    source.start(0);

    // Set up a progress simulation for the encoding phase
    let progressInterval: number | null = null;
    let currentProgress = 5;
    const targetProgress = 100;
    const duration = audioBuffer.duration * 1000; // Convert to ms
    const progressStep = (targetProgress - currentProgress) / (duration / 100); // Update every 100ms

    if (onProgress) {
      progressInterval = window.setInterval(() => {
        // Gradually increase progress during encoding
        currentProgress += progressStep;
        // Ensure we don't exceed the target
        if (currentProgress >= targetProgress) {
          currentProgress = targetProgress - 1; // Keep it just below target
          clearInterval(progressInterval!);
          progressInterval = null;
        }
        onProgress(Math.round(currentProgress));
      }, 100);
    }

    // Wait for the recording to finish
    const opusBlob = await new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (typedArray) => {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        const blob = new Blob([typedArray], { type: 'audio/ogg; codecs=opus' });
        if (onProgress) onProgress(85);
        resolve(blob);
      };

      // When the audio finishes playing, stop the recorder
      source.onended = () => {
        if (onProgress) onProgress(100);
        recorder.stop();
      };

      // Safety timeout in case onended doesn't fire
      setTimeout(() => {
        try {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          recorder.stop();
        } catch (err) {
          reject(err);
        }
      }, duration + 500); // Add a small buffer
    });

    // Create a new File from the Blob
    if (onProgress) onProgress(100);
    const compressedFile = new File(
      [opusBlob],
      file.name.replace(/\.[^/.]+$/, '.opus'), // Replace the extension with .opus
      { type: 'audio/ogg; codecs=opus' }
    );

    const compressedSize = compressedFile.size;
    if (onProgress) onProgress(95);

    // Log compression results
    console.log(
      `Audio compression results:\n` +
      `Original size: ${(originalSize / 1024).toFixed(2)}KB\n` +
      `Compressed size: ${(compressedSize / 1024).toFixed(2)}KB\n` +
      `Reduction: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%\n` +
      `Channels: ${audioBuffer.numberOfChannels}\n` +
      `Sample Rate: ${audioBuffer.sampleRate}Hz\n` +
      `Duration: ${audioBuffer.duration.toFixed(2)}s`
    );

    // Close the audio context
    await audioContext.close();

    // Final progress update
    if (onProgress) onProgress(100);

    return { compressedFile, originalSize, compressedSize, duration: audioBuffer.duration };
  } catch (error) {
    console.error('Error compressing audio:', error);
    // If compression fails, return the original file
    return { compressedFile: file, originalSize, compressedSize: originalSize, duration: 0 };
  }
}

/**
 * Alternative implementation using MediaRecorder API for browsers that support it
 * This is now the primary method as it's more widely supported
 * @param file The audio file to compress
 * @param onProgress Optional callback for progress updates (0-100)
 * @param onDurationAvailable Optional callback that is called as soon as the audio duration is known
 */
export async function compressAudioWithMediaRecorder(file: File, onProgress?: (progress: number) => void, onDurationAvailable?: (duration: number) => void): Promise<{
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  duration: number;
}> {
  const originalSize = file.size;

  // If the file is already small enough (less than 1MB), return it as is
  if (file.size < 1024 * 1024) {
    // Report 100% progress immediately for small files
    if (onProgress) onProgress(100);

    // For small files, we need to get the duration
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;

      // Call the duration callback if provided
      if (onDurationAvailable && duration > 0) {
        onDurationAvailable(duration);
      }

      await audioContext.close();
      return { compressedFile: file, originalSize, compressedSize: originalSize, duration };
    } catch (err) {
      console.warn('Could not determine duration for small file:', err);
      return { compressedFile: file, originalSize, compressedSize: originalSize, duration: 0 };
    }
  }

  // Start with initial progress
  if (onProgress) onProgress(10);

  try {
    // Determine the best supported MIME type for audio compression
    let mimeType = 'audio/webm';
    let extension = 'webm';

    // Check for codec support in order of preference
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
      extension = 'webm';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
      extension = 'ogg';
    } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.5')) {
      mimeType = 'audio/mp4;codecs=mp4a.40.5';
      extension = 'mp4';
    } else if (!MediaRecorder.isTypeSupported('audio/webm')) {
      // If no supported format is found, throw an error
      throw new Error('No supported audio format found for MediaRecorder');
    }

    console.log(`Using MIME type: ${mimeType} for audio compression`);

    // Create an audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (onProgress) onProgress(5);

    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(10);

    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // We now have the duration, report it immediately if callback provided
    if (onDurationAvailable && audioBuffer.duration > 0) {
      onDurationAvailable(audioBuffer.duration);
    }

    if (onProgress) onProgress(35);

    // Create a MediaStream directly from the audio context
    const dest = audioContext.createMediaStreamDestination();
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(dest);
    if (onProgress) onProgress(40);

    // Create a MediaRecorder with the best supported codec
    const mediaRecorder = new MediaRecorder(dest.stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000 // 128k bitrate
    });
    if (onProgress) onProgress(45);

    // Start recording
    mediaRecorder.start();
    if (onProgress) onProgress(5);

    // Start the buffer source
    bufferSource.start(0);

    // Set up a progress simulation for the encoding phase
    let progressInterval: number | null = null;
    let currentProgress = 5;
    const targetProgress = 100;
    const duration = audioBuffer.duration * 1000; // Convert to ms
    const progressStep = (targetProgress - currentProgress) / (duration / 100); // Update every 100ms

    if (onProgress) {
      progressInterval = window.setInterval(() => {
        // Gradually increase progress during encoding
        currentProgress += progressStep;
        // Ensure we don't exceed the target
        if (currentProgress >= targetProgress) {
          currentProgress = targetProgress - 1; // Keep it just below target
          clearInterval(progressInterval!);
          progressInterval = null;
        }
        onProgress(Math.round(currentProgress));
      }, 100);
    }

    // Wait for the recording to finish
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const audioBlob = await new Promise<Blob>((resolve, reject) => {
      // Handle errors
      mediaRecorder.onerror = (event) => {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        reject(new Error(`MediaRecorder error: ${event}`));
      };

      mediaRecorder.onstop = () => {
        try {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          if (onProgress) onProgress(85);
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        } catch (err) {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          reject(err);
        }
      };

      // When the audio finishes playing, stop the recorder
      bufferSource.onended = () => {
        try {
          if (mediaRecorder.state !== 'inactive') {
            if (onProgress) onProgress(100);
            mediaRecorder.stop();
          }
        } catch (err) {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          reject(err);
        }
      };

      // Safety timeout in case onended doesn't fire
      setTimeout(() => {
        try {
          if (mediaRecorder.state !== 'inactive') {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
            mediaRecorder.stop();
          }
        } catch (err) {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          reject(err);
        }
      }, duration + 500); // Add a small buffer
    });

    // Create a new File from the Blob
    if (onProgress) onProgress(100);
    const compressedFile = new File(
      [audioBlob],
      file.name.replace(/\.[^/.]+$/, `.${extension}`), // Replace the extension
      { type: mimeType }
    );

    const compressedSize = compressedFile.size;
    if (onProgress) onProgress(95);

    // Log compression results
    console.log(
      `Audio compression results (MediaRecorder):\n` +
      `Original size: ${(originalSize / 1024).toFixed(2)}KB\n` +
      `Compressed size: ${(compressedSize / 1024).toFixed(2)}KB\n` +
      `Reduction: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%\n` +
      `Channels: ${audioBuffer.numberOfChannels}\n` +
      `Sample Rate: ${audioBuffer.sampleRate}Hz\n` +
      `Duration: ${audioBuffer.duration.toFixed(2)}s`
    );

    // Close the audio context
    await audioContext.close();

    // Final progress update
    if (onProgress) onProgress(100);

    return { compressedFile, originalSize, compressedSize, duration: audioBuffer.duration };
  } catch (error) {
    console.error('Error compressing audio with MediaRecorder:', error);
    // If compression fails, return the original file
    return { compressedFile: file, originalSize, compressedSize: originalSize, duration: 0 };
  }
}

/**
 * Main function that tries both compression methods
 * @param file The audio file to compress
 * @param onProgress Optional callback for progress updates (0-100)
 * @param onDurationAvailable Optional callback that is called as soon as the audio duration is known
 */
export async function compressAudioFile(file: File, onProgress?: (progress: number) => void, onDurationAvailable?: (duration: number) => void): Promise<{
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  duration: number;
}> {
  try {
    // Try the MediaRecorder method first as it's more widely supported
    return await compressAudioWithMediaRecorder(file, onProgress, onDurationAvailable);
  } catch (error) {
    console.warn('MediaRecorder compression failed, trying opus-recorder fallback:', error);
    try {
      // Fall back to opus-recorder method
      return await compressAudio(file, onProgress, onDurationAvailable);
    } catch (fallbackError) {
      console.error('All compression methods failed:', fallbackError);
      // If all compression methods fail, return the original file
      return { compressedFile: file, originalSize: file.size, compressedSize: file.size, duration: 0 };
    }
  }
}
