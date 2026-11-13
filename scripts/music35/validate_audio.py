import json,subprocess,hashlib,numpy as np
from pathlib import Path
p=Path(__file__).parent;r=p/'release';manifest=json.loads((r/'manifest.json').read_text());report=[]
score=json.loads((p/'umejima-score.json').read_text())
manifest[0]['events']=[[e['pitch'],e['beat'],e['duration'],e['velocity'],e['instrument']] for e in score['events']]
manifest[0]['source']='scripts/music35/render_umejima_loop.py'
for m in manifest:
 f=r/Path(m['asset']).name
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-f','f32le','-ac','2','-ar','44100','-'])
 a=np.frombuffer(raw,dtype='<f4').reshape(-1,2); N=m['loopSamples'];a=a[:N]
 rms=np.sqrt(np.mean(a*a));peak=np.max(abs(a));seam=float(np.max(abs(a[0]-a[-1])));slope=float(np.quantile(abs(np.diff(a,axis=0)),.999))
 assert len(a)==N and np.isfinite(a).all() and peak<1 and rms>.005
 # Adjacent-sample jump at cyclic boundary must be small, below -40 dBFS.
 assert seam<.01,(m['number'],seam)
 m['sha256']=hashlib.sha256(f.read_bytes()).hexdigest();m['fullDecodePassed']=True;m['seamPeakDelta']=seam
 m['auditionReviewed']=m['number']==1
 report.append(dict(number=m['number'],seconds=len(a)/44100,rmsDb=round(float(20*np.log10(rms)),2),peakDb=round(float(20*np.log10(peak)),2),boundaryJump=seam,maxUsualStep=slope,bytes=f.stat().st_size))
# Independent note/rhythm fingerprints, excluding instrumental differences.
fingerprints=[]
for m in manifest:
 es=m['events']; pitches=[e[0] for e in es];base=pitches[0];fp=tuple((e[0]-base,e[1],e[2]) for e in es)
 assert fp not in fingerprints;fingerprints.append(fp)
(r/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(r/'audio-validation.json').write_text(json.dumps(dict(decodePassed=len(report),uniqueEventPatterns=len(fingerprints),auditoryEvaluation='User approved garden 1 prototype; remaining tracks not human-listened',tracks=report),ensure_ascii=False,indent=2))
print('Decoded and checked',len(report),'unique scores; total bytes',sum(t['bytes'] for t in report))
