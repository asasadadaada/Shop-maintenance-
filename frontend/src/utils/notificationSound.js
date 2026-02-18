// Create a loud and clear notification sound
export const playNotificationSound = () => {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create three beeps for attention
    const playBeep = (frequency, startTime, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Louder volume (0.5 = 50% max volume)
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // Play 3 beeps: High - Medium - High
    playBeep(1000, 0, 0.2);      // First beep (high pitch)
    playBeep(800, 0.25, 0.2);    // Second beep (medium pitch)
    playBeep(1000, 0.5, 0.3);    // Third beep (high pitch, longer)
    
    // Vibrate if supported (strong pattern)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
    
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};
