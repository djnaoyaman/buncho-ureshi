"""Reproduce the five approved recordings; never synthesize or fetch replacements.
Usage: python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY
Requires ffmpeg and numpy. Exact originals are verified before any output is written.
"""
import hashlib, json, pathlib, subprocess, sys, wave
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]
ROWS=json.loads((ROOT/'docs/qa/garden-five-runway.json').read_text())
original_dir=pathlib.Path(sys.argv[1]); rate=44100
for row in ROWS:
    original=original_dir/row['original']['name']
    assert hashlib.sha256(original.read_bytes()).hexdigest()==row['original']['sha256'], original
for row in ROWS:
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(original_dir/row['original']['name']),'-f','f32le','-ar',str(rate),'-ac','2','-'])
    x=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
    s,n,c,g=(row[k] for k in ['startSample','loopSamples','crossfadeSamples','guardSamples'])
    assert s>=c and s+n<=len(x)
    loop=x[s:s+n].astype(np.float64).copy()
    # Preserve the musical period: blend the end into the pre-roll before s,
    # rather than dropping c samples and shortening every subsequent bar.
    weight=(.5-.5*np.cos(np.linspace(0,np.pi,c)))[:,None]
    loop[-c:]=loop[-c:]*(1-weight)+x[s-c:s]*weight
    loop*=10**(row['gainDb']/20)
    assert np.max(np.abs(loop))<.98
    pcm=np.rint(loop*32767).astype('<i2')
    guarded=np.concatenate([pcm[-g:],pcm,pcm[:g]])
    dest=ROOT/'public'/row['asset']; dest.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(dest),'wb') as out:
        out.setnchannels(2);out.setsampwidth(2);out.setframerate(rate);out.writeframes(guarded.tobytes())
    print(json.dumps({'gardenId':row['gardenId'],'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'seamPeakDelta':float(np.max(np.abs(pcm[0].astype(float)-pcm[-1]))/32768),'rms':float(np.sqrt(np.mean(loop**2)))}))
