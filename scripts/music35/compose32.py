"""32 original garden miniatures. Hand-authored motifs, no external samples."""
import json, numpy as np, wave, subprocess, hashlib
from pathlib import Path
P=Path(__file__).parent; OUT=P/'release'; OUT.mkdir(exist_ok=True); SR=44100
plans=json.loads((P/'gardens.json').read_text())
# number: tempo, beats/bar, tonic, mode, voice, motif (scale degrees, -1=rest), rhythm, harmonic route
CONFIG={
1:(84,4,60,'major','piano',[2,4,5,4,-1,1,2,4,2,1],[1,.5,.5,1,1,.5,.5,1.5,.5,1],[0,4,5,4,0,5,3,4]),
2:(92,4,62,'major','piano',[0,2,4,6,5,2,3,4,1,-1],[.5,.5,1,.5,.5,1],[0,3,1,4,5,2,3,4]),
3:(88,4,65,'major','wood',[2,2,4,4,-1,1,1,3,3,0],[.5,.5,1,1,1],[0,1,3,4,0,5,1,4]),
4:(96,3,67,'major','bell',[4,-1,2,5,-1,4,1,2,0],[.5,.5,1,.5,.5],[0,5,3,4,2,5,1,4]),
5:(76,4,62,'major','bell',[0,4,2,-1,6,5,2,1,-1,0],[.5,1.5,.5,1,.5],[0,1,5,3,0,2,3,4]),
6:(80,4,65,'major','flute',[0,1,2,4,2,1,3,2,0,-1],[1,1,.5,.5,1],[0,4,5,2,3,0,1,4]),
7:(104,4,60,'major','pluck',[0,0,4,2,1,3,2,-1,4,5],[.5,.5,.5,.5,1,1],[0,3,0,4,5,3,1,4]),
8:(74,4,62,'dorian','flute',[4,3,1,-1,0,2,3,1,0],[1.5,.5,1,1],[0,3,0,4,5,3,1,0]),
9:(82,4,55,'major','wood',[0,2,1,4,-1,2,0,1,2],[1,.5,.5,1,1],[0,5,1,4,3,0,1,4]),
10:(78,3,60,'major','piano',[0,2,4,1,3,5,2,4,6,4,2,0],[1,1,1],[0,1,2,3,0,5,1,4]),
11:(100,4,62,'major','pluck',[0,1,2,1,2,3,2,3,4,-1],[.5,.5,.5,.5,1,1],[0,3,5,4,0,2,1,4]),
12:(86,3,64,'minor','strings',[0,2,3,4,3,1,2,0,-1],[1,.5,.5,1],[0,3,5,4,0,2,3,4]),
13:(88,4,65,'major','strings',[0,4,7,6,5,4,2,3,4,-1],[2,1,1,2,2],[0,3,5,4,1,3,0,4]),
14:(68,3,62,'minor','pluck',[4,5,7,6,4,3,2,1,0],[1.5,.5,1],[0,5,3,4,0,2,3,4]),
15:(84,4,55,'major','clarinet',[0,3,2,5,4,1,2,0,4,3],[.5,1,.5,1,1],[0,2,3,1,5,0,3,4]),
16:(72,4,55,'major','clarinet',[2,0,-1,4,3,2,1,0],[1.5,.5,2],[0,5,3,4,2,5,1,4]),
17:(102,3,67,'major','pluck',[4,6,5,7,4,2,3,5,1],[.5,.5,.5,.5,1],[0,3,1,4,5,2,3,4]),
18:(70,4,65,'major','flute',[2,-1,1,0,-1,4,2,3,1],[1,1,2],[0,3,0,5,1,4,3,0]),
19:(66,4,48,'major','piano',[0,-1,2,-1,1,4,-1,0],[2,1,1],[0,3,5,0,1,3,4,0]),
20:(80,4,62,'major','flute',[4,2,5,-1,4,2,1,-1,0],[.5,.5,1,2],[0,4,3,0,5,2,1,4]),
21:(78,3,60,'minor','piano',[4,2,3,1,0,-1,2,4,3],[1,.5,.5,1],[0,5,2,4,3,0,5,4]),
22:(90,4,62,'major','wood',[0,3,2,-1,1,4,3,-1,2,0],[.5,.5,1,1,1],[0,1,3,4,5,0,1,4]),
23:(94,4,67,'major','pluck',[0,2,4,5,7,5,4,2,1,0],[1,.5,.5,1,1],[0,3,4,0,5,2,1,4]),
24:(86,3,65,'major','strings',[0,4,5,6,4,2,1,3,4],[1.5,.5,1],[0,5,3,4,2,3,1,4]),
25:(64,4,55,'major','piano',[2,1,0,-1,4,3,2,0],[2,1,1],[0,3,5,2,1,4,3,0]),
27:(70,4,62,'minor','clarinet',[0,2,4,-1,3,1,2,-1,0],[1.5,.5,2],[0,3,5,4,0,2,3,0]),
28:(76,3,65,'major','flute',[2,4,3,1,2,0,4,5,4],[.5,.5,1,1],[0,5,1,4,3,2,1,4]),
29:(68,4,62,'major','bell',[4,7,6,4,-1,2,1,0],[2,1,1],[0,3,5,4,2,3,1,0]),
31:(90,3,65,'major','piano',[0,2,4,3,1,2,5,4,2,0],[1,.5,.5,1],[0,3,1,4,5,2,3,4]),
32:(82,4,60,'major','piano',[0,1,2,-1,2,3,4,-1,4,2,1,0],[.5,.5,1,2],[0,5,3,0,1,4,3,0]),
33:(96,4,62,'major','wood',[0,4,2,5,3,6,4,2,0],[.5,1,.5,1,1],[0,3,1,4,5,3,2,4]),
34:(76,4,55,'dorian','clarinet',[2,0,-1,1,3,2,-1,4,1,0],[1,.5,1.5,1],[0,3,0,4,5,3,1,0]),
}
SCALES={'major':[0,2,4,5,7,9,11],'minor':[0,2,3,5,7,8,10],'dorian':[0,2,3,5,7,9,10]}
def synth(p,dur,voice,vel):
 t=np.arange(round((dur+1.6)*SR))/SR; f=440*2**((p-69)/12)
 if voice=='wood': y=np.sin(2*np.pi*f*t)*np.exp(-t/.3)+.2*np.sin(2*np.pi*f*3.98*t)*np.exp(-t/.07); env=1-np.exp(-t/.002)
 elif voice=='bell': y=sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t/(1.3/k**.4)) for k,a in [(1,1),(2,.16),(2.76,.06),(4.1,.025)]);env=1-np.exp(-t/.004)
 elif voice=='pluck': y=sum(np.sin(2*np.pi*f*k*t)*np.exp(-t/(.9/k**.55))/k**1.8 for k in range(1,7));env=1-np.exp(-t/.004)
 elif voice in ('flute','clarinet','strings'):
  harmonics={'flute':[(1,1),(2,.11),(3,.035)],'clarinet':[(1,1),(3,.2),(5,.075)],'strings':[(1,1),(2,.3),(3,.13),(4,.05)]}[voice]
  phase=2*np.pi*f*t+.028*np.sin(2*np.pi*4.7*t)*np.minimum(t,1)
  y=sum(a*np.sin(k*phase) for k,a in harmonics);env=(1-np.exp(-t/.055))*np.exp(-t/5)
 else:y=sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t/(1.9/k**.55)) for k,a in [(1,1),(2,.37),(3,.15),(4,.055),(5,.025)]);env=1-np.exp(-t/.005)
 return y*env*np.exp(-np.maximum(0,t-dur)/.22)*vel*.1

def make(g,c):
 number=g['number'];bpm,meter,key,mode,voice,motif,rhythm,route=c;beat=60/bpm;bars=16;beats=bars*meter;N=round(beats*beat*SR);buf=np.zeros((N,2));events=[];scale=SCALES[mode]
 def pitch(deg):return key+12*(deg//7)+scale[deg%7]
 def note(p,b,d,v,inst,pan=0):
  events.append([p,round(b,3),round(d,3),v,inst]);s=synth(p,d*beat,inst,v);n=len(s);start=round(b*beat*SR)%N;st=np.column_stack([s*np.sqrt((1-pan)/2),s*np.sqrt((1+pan)/2)])
  # Wrap decay into beginning: seamless cyclic master, no arbitrary fade.
  for off in range(0,n,N):
   segment=st[off:off+N];k=min(len(segment),N-start);buf[start:start+k]+=segment[:k]
   if len(segment)>k:buf[:len(segment)-k]+=segment[k:]
 for bar in range(bars):
  root=route[bar%8];ch=[pitch(root)-12,pitch(root+2)-12,pitch(root+4)-12]
  note(ch[0]-12,bar*meter,1.5,.30,'piano',-.15)
  for j in range(1,meter):note(ch[j%3],bar*meter+j,.7,.20,'pluck' if voice=='strings' else 'piano',.18)
  if number==31:
   for j in [1,2]:
    for p in ch[1:]:note(p,bar*meter+j,.7,.17,'piano',.1)
  cursor=0;idx=0
  while cursor<meter:
   # Distinct authored phrase; four-bar responses and a contrasting middle.
   index=(bar%4*3+idx)%len(motif);degree=motif[index]
   d=min(rhythm[(idx+bar)%len(rhythm)],meter-cursor)
   if degree>=0:
    if 8<=bar<12:degree=degree+2 if bar%2==0 else max(0,6-degree)
    if bar==15 and cursor>=meter-2:degree=0
    note(pitch(degree),bar*meter+cursor,d*.88,.58+(bar%4==0)*.04,voice,-.08)
   cursor+=d;idx+=1
  if voice=='wood' and bar%2:note(pitch(root+4),bar*meter+meter-.5,.35,.22,'wood',.3)
 dry=buf.copy()
 for delay,gain in [(.067,.12),(.113,.08),(.179,.045)]:buf+=np.roll(dry[:,::-1],round(delay*SR),axis=0)*gain
 rms=np.sqrt(np.mean(buf**2));buf*=10**(-21.2/20)/max(rms,1e-12); peak=abs(buf).max()
 if peak>.88:buf*=.88/peak
 name=f'garden-{number:02d}';wav=OUT/(name+'.wav');mp3=OUT/(name+'.mp3')
 with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((buf*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','libmp3lame','-q:a','2','-metadata','title='+g['name'],str(mp3)],check=True);wav.unlink()
 return dict(number=number,gardenId=g['id'],title=g['name'],themeId='garden35-'+g['id'],asset='audio/gardens35/'+mp3.name,bpm=bpm,meter=meter,loopStartSeconds=0,loopEndSeconds=N/SR,loopSamples=N,sampleRate=SR,sha256=hashlib.sha256(mp3.read_bytes()).hexdigest(),originalComposition=True,externalSamples=False,source='scripts/music35/compose32.py',auditionReviewed=number==1,events=events)
manifest=[]
for g in plans:
 if g['number'] in CONFIG:
  m=make(g,CONFIG[g['number']]);manifest.append(m);print(m['number'],m['title'],round(m['loopEndSeconds'],1),flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
