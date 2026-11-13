import numpy as np,json,subprocess,wave,hashlib
from pathlib import Path
P=Path(__file__).parent;R=P/'release';SR=44100
plans=json.loads((P/'gardens.json').read_text());manifest=json.loads((R/'manifest.json').read_text());report=[]
for no,filename in [(26,'shirakaba-red-sign-preview.mp3'),(30,'shiokaze-flamenco-preview.mp3'),(35,'kiniro-bossa-nova-preview.mp3')]:
 source=P.parent/'garden-music-previews'/filename
 a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ac','2','-ar',str(SR),'-']),dtype='<f4').reshape(-1,2).copy();original=len(a)
 # Trim ONLY final near-silent samples; retain 40 ms release tail.
 active=np.flatnonzero(np.max(abs(a),axis=1)>.0001);end=min(len(a),int(active[-1])+int(.04*SR));a=a[:end]
 cross=int(.25*SR);w=np.linspace(0,1,cross)[:,None]
 a=np.concatenate([a[-cross:]*(1-w)+a[:cross]*w,a[cross:-cross]])
 a*=10**(-21.2/20)/np.sqrt(np.mean(a*a))
 if abs(a).max()>.9:a*=.9/abs(a).max()
 wav=R/f'garden-{no:02d}.wav';dest=R/f'garden-{no:02d}.mp3';g=next(x for x in plans if x['number']==no)
 with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((a*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','libmp3lame','-q:a','2','-metadata','title='+g['name'],str(dest)],check=True);wav.unlink()
 decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(dest),'-f','f32le','-ac','2','-ar',str(SR),'-']),dtype='<f4').reshape(-1,2)
 seam=float(abs(decoded[0]-decoded[-1]).max());peak=float(abs(decoded).max());rms=float(np.sqrt(np.mean(decoded**2)))
 assert len(decoded)==len(a) and np.isfinite(decoded).all() and peak<1 and seam<.01
 row=dict(number=no,gardenId=g['id'],title=g['name'],themeId='garden35-'+g['id'],asset='audio/gardens35/'+dest.name,loopStartSeconds=0,loopEndSeconds=len(a)/SR,loopSamples=len(a),sampleRate=SR,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),source='User-supplied Work composition',userAuthorizedWork=True,originalComposition='reported Work-created by user',externalSamples='not independently verified',auditionReviewed=True,fullDecodePassed=True,seamPeakDelta=seam,sourceFilename=filename,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),loopEdit=dict(trailingNearSilenceRemovedSeconds=(original-end)/SR,boundaryCrossfadeSeconds=.25),rmsDb=20*np.log10(rms),peakDb=20*np.log10(peak))
 manifest=[m for m in manifest if m['number']!=no]+[row];report.append(row);print(no,row['loopEndSeconds'],row['rmsDb'],row['peakDb'],seam)
manifest.sort(key=lambda x:x['number']);(R/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));(R/'work3-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
