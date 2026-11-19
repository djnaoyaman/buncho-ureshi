"""Package the approved independent Bach performance; never synthesize a replacement.
Usage: python scripts/music35/prepare_bach645.py EXTRACTED_APPROVED_PACKAGE
Audio/source adaptation: CC BY-SA 2.5, Bart Golsteijn / Mutopia 601.
See public/audio/gardens35/bach-bwv645-license.html. Requires ffmpeg and numpy.
"""
import hashlib, pathlib, subprocess, sys, tempfile, wave
import numpy as np

root = pathlib.Path(__file__).resolve().parents[2]
source = pathlib.Path(sys.argv[1]) / 'BWV645-garden31-repeat-candidate.wav'
assert hashlib.sha256(source.read_bytes()).hexdigest() == 'b2800a49580034328407a5bff1efc33b18a1a2460899f597776a52cc128906dd'
with wave.open(str(source)) as w:
    assert (w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()) == (44100, 2, 2, 3087000)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, 2).astype(float) / 32768
x *= 10 ** (4.2 / 20)
assert np.max(abs(x)) < .98
guard = 882
pcm = np.rint(np.concatenate([x[-guard:], x, x[:guard]]) * 32767).astype('<i2')
dest = root / 'public/audio/gardens35/garden-31-bwv645-v1.mp3'
with tempfile.TemporaryDirectory() as directory:
    intermediate = pathlib.Path(directory) / 'guarded.wav'
    with wave.open(str(intermediate), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(intermediate), '-codec:a', 'libmp3lame', '-b:a', '192k', '-write_xing', '1', str(dest)], check=True)
print(hashlib.sha256(dest.read_bytes()).hexdigest(), dest.stat().st_size)
