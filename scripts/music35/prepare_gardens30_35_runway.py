"""Reproduce the two approved Runway recordings without generation or fetching.
Usage: python scripts/music35/prepare_gardens30_35_runway.py ORIGINAL_DIRECTORY
Requires numpy and ffmpeg/libmp3lame; original hashes are verified.
"""
from pathlib import Path
import hashlib,json,subprocess,sys
import numpy as np
root=Path(__file__).resolve().parents[2];rows=json.loads((root/'docs/qa/gardens30-35-runway.json').read_text())
for r in rows:
    src=Path(sys.argv[1])/r['original']['name']
    assert hashlib.sha256(src.read_bytes()).hexdigest()==r['original']['sha256']
    x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(src),'-f','f32le','-ar','44100','-ac','2','-']),dtype='<f4').reshape(-1,2)
    s,n,c,g=(r[k] for k in ['startSample','loopSamples','crossfadeSamples','guardSamples']);assert s>=c and s+n<=len(x)
    loop=x[s:s+n].astype('float64').copy();w=(.5-.5*np.cos(np.linspace(0,np.pi,c)))[:,None];loop[-c:]=loop[-c:]*(1-w)+x[s-c:s]*w;loop*=10**(r['gainDb']/20);assert np.max(abs(loop))<.98
    samples=np.concatenate([loop[-g:],loop,loop[:g]]).astype('<f4');dest=root/'public'/r['asset']
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','44100','-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','192k','-map_metadata','-1',str(dest)],input=samples.tobytes(),check=True)
    print(json.dumps({'asset':r['asset'],'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}))
