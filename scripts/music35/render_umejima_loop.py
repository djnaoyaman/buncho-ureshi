"""Original 16-bar garden audition. No external samples or quoted melodies."""
import numpy as np, wave, json
from pathlib import Path
SR=44100; BPM=84; BEAT=60/BPM; LENGTH=16*4*BEAT
out=Path(__file__).parent; audio=np.zeros((round((LENGTH+2)*SR),2),np.float64)
events=[]
def note(p,start,dur,vel=.4,kind='piano',pan=.0):
    events.append(dict(pitch=p,beat=start,duration=dur,velocity=vel,instrument=kind))
    t=np.arange(round((dur*BEAT+1.6)*SR))/SR; f=440*2**((p-69)/12)
    if kind=='piano':
        signal=sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t/(1.9/(k**.55))) for k,a in [(1,1),(2,.37),(3,.15),(4,.055),(5,.025)])
        env=(1-np.exp(-t/.005)); release=np.exp(-np.maximum(0,t-dur*BEAT)/.22)
    else:
        signal=np.sin(2*np.pi*f*t)*np.exp(-t/.30)+.2*np.sin(2*np.pi*f*3.98*t)*np.exp(-t/.07)
        env=1-np.exp(-t/.002);release=1
    signal*=env*release*vel*.10
    stereo=np.column_stack((signal*np.sqrt((1-pan)/2),signal*np.sqrt((1+pan)/2)))
    pos=round(start*BEAT*SR);n=min(len(stereo),len(audio)-pos)
    if n>0:audio[pos:pos+n]+=stereo[:n]
# Deliberately authored A A' B A'' phrases: pauses and answering mallet.
melody=[[(64,1),(67,.5),(69,.5),(67,1),(None,1)],[(62,.5),(64,.5),(67,1.5),(64,.5),(62,1)],[(60,1.5),(64,.5),(65,1),(64,1)],[(62,1),(59,1),(60,1),(None,1)],[(64,.5),(67,.5),(72,1),(71,.5),(69,.5),(67,1)],[(69,1.5),(67,.5),(64,1),(None,1)],[(65,1),(64,.5),(62,.5),(60,1),(62,1)],[(64,2),(None,1),(67,1)],[(69,1),(72,.5),(74,.5),(72,1),(69,1)],[(67,1.5),(71,.5),(74,1),(None,1)],[(72,1),(69,1),(65,.5),(67,.5),(69,1)],[(67,1),(64,1),(62,1),(None,1)],[(64,1),(67,.5),(69,.5),(72,1),(67,1)],[(69,1),(67,1),(64,1),(62,1)],[(65,1.5),(64,.5),(62,1),(59,1)],[(60,2),(None,2)]]
chords=[(48,55,60,64),(47,55,59,62),(45,52,57,60),(43,53,55,59),(48,55,60,64),(45,52,57,60),(41,53,57,60),(43,55,59,62),(41,53,57,60),(43,55,59,62),(45,52,57,60),(40,52,55,59),(41,53,57,60),(48,55,60,64),(43,53,55,59),(48,55,60,64)]
for b,(phrase,chord) in enumerate(zip(melody,chords)):
    cursor=b*4
    for p,d in phrase:
        if p is not None:note(p,cursor,d*.88,.62 if b<8 else .67,pan=-.08)
        cursor+=d
    note(chord[0],b*4,1.8,.32,pan=-.18)
    for offset,index in [(1,1),(1.5,2),(2.5,3),(3,2)]:
        note(chord[index],b*4+offset,.62,.21,pan=.16)
    if b in [1,3,5,7,9,11,13]:
        for j,p in enumerate([chord[2]+12,chord[3]+12]):note(p,b*4+3+j*.5,.35,.28,'wood',.3)
# Light cross-channel room echoes; no convolution samples.
dry=audio.copy()
for delay,gain in [(.067,.12),(.113,.08),(.179,.045)]:
    shift=round(delay*SR);audio[shift:]+=dry[:-shift,::-1]*gain
# Cyclic seam, retain the approved composition
N=round(LENGTH*SR)
tail=audio[N:].copy();audio=audio[:N];audio[:len(tail)]+=tail
audio*=10**(-21.2/20)/max(np.sqrt(np.mean(audio**2)),1e-9)
with wave.open(str(out/'release/garden-01.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((audio*32767).astype('<i2').tobytes())
(out/'umejima-score.json').write_text(json.dumps(dict(title='足立区梅島公園・木もれ日の待ち合わせ',status='audition-not-approved',bpm=BPM,bars=16,originalComposition=True,externalSamples=False,events=events),ensure_ascii=False,indent=2))
print('Rendered',len(audio)/SR,'seconds; audition only, not loop master')
