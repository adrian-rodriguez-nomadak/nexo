import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

class ObserverAnnouncer {
  ObserverAnnouncer({FlutterTts? textToSpeech})
    : _textToSpeech = textToSpeech ?? FlutterTts();

  final FlutterTts _textToSpeech;

  Future<void> announceSaved({
    required String moduleName,
    required String summary,
    required bool playSound,
    required bool speak,
  }) async {
    if (playSound) {
      await SystemSound.play(SystemSoundType.alert);
    }
    if (!speak) return;

    await _textToSpeech.setLanguage('es-MX');
    await _textToSpeech.setSpeechRate(0.48);
    await _textToSpeech.speak('Guardado en $moduleName. $summary');
  }

  Future<void> stop() => _textToSpeech.stop();
}
