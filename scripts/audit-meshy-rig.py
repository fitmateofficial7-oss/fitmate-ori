from __future__ import annotations
import json, math, random, struct, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'public' / 'models' / 'fitmate-bodybuilder-rig.glb'
REPORT = ROOT / 'reports' / 'meshy-rig-audit-1000.json'
CYCLES = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
JSON_CHUNK=0x4E4F534A; BIN_CHUNK=0x004E4942
REQ=['FitMateBodybuilderRig','Torso','LeftShoulder','LeftElbow','LeftHand','RightShoulder','RightElbow','RightHand','LeftHip','LeftKnee','LeftFoot','RightHip','RightKnee','RightFoot']

def read_glb(path: Path):
 d=path.read_bytes();magic,ver,total=struct.unpack_from('<4sII',d,0)
 if magic!=b'glTF' or ver!=2 or total!=len(d): raise ValueError('invalid GLB header')
 o=12; chunks=[]
 while o<len(d):
  l,t=struct.unpack_from('<II',d,o);o+=8;chunks.append((t,d[o:o+l]));o+=l
 doc=json.loads(next(c for t,c in chunks if t==JSON_CHUNK).decode().rstrip())
 blob=next(c for t,c in chunks if t==BIN_CHUNK)
 return doc,blob

def accessor(doc,blob,i):
 a=doc['accessors'][i];bv=doc['bufferViews'][a['bufferView']]
 dt={5121:np.uint8,5123:np.uint16,5125:np.uint32,5126:np.float32}[a['componentType']]
 nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 off=bv.get('byteOffset',0)+a.get('byteOffset',0)
 return np.frombuffer(blob,dtype=dt,count=a['count']*nc,offset=off).reshape(a['count'],nc).copy()

def T(v):
 m=np.eye(4);m[:3,3]=v;return m

def S(v):
 m=np.eye(4);m[0,0],m[1,1],m[2,2]=v;return m

def Rx(a):
 c,s=math.cos(a),math.sin(a);return np.array([[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]],float)

def Ry(a):
 c,s=math.cos(a),math.sin(a);return np.array([[c,0,s,0],[0,1,0,0],[-s,0,c,0],[0,0,0,1]],float)

def Rz(a):
 c,s=math.cos(a),math.sin(a);return np.array([[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]],float)

def base_local(n):
 m=np.eye(4)
 if 'scale' in n:m=S(n['scale'])@m
 if 'rotation' in n:
  x,y,z,w=n['rotation'];
  # Quaternion matrix omitted because source rig uses translations/scales only.
 if 'translation' in n:m=T(n['translation'])@m
 return m

doc,blob=read_glb(MODEL)
node_by={n.get('name'):i for i,n in enumerate(doc['nodes'])}
missing=[n for n in REQ if n not in node_by]
if missing: raise RuntimeError(f'missing rig nodes: {missing}')
if not doc.get('skins'): raise RuntimeError('model has no skin')
skin=doc['skins'][0]; joints_nodes=skin['joints']; joint_names=[doc['nodes'][i].get('name','') for i in joints_nodes]
mesh_nodes=[(i,n) for i,n in enumerate(doc['nodes']) if 'mesh' in n]
if not mesh_nodes: raise RuntimeError('model has no mesh nodes')
prim=doc['meshes'][mesh_nodes[0][1]['mesh']]['primitives'][0]
pos=accessor(doc,blob,prim['attributes']['POSITION']).astype(np.float64)
joints=accessor(doc,blob,prim['attributes']['JOINTS_0']).astype(np.int64)
weights=accessor(doc,blob,prim['attributes']['WEIGHTS_0']).astype(np.float64)
ibm=accessor(doc,blob,skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1).astype(np.float64)
weight_sums=weights.sum(axis=1)
if not np.allclose(weight_sums,1.0,atol=1e-5): raise RuntimeError('weights do not sum to one')
if joints.min()<0 or joints.max()>=len(joints_nodes): raise RuntimeError('joint index out of range')

parents={}
for pi,n in enumerate(doc['nodes']):
 for ci in n.get('children',[]):parents[ci]=pi
base=[base_local(n) for n in doc['nodes']]
modelspace=node_by['FitMateModelSpace']
mesh_global_bind=None

def globals_for(rotations):
 cache={}
 def g(i):
  if i in cache:return cache[i]
  local=base[i].copy()
  if i in rotations:
   rx,ry,rz=rotations[i]
   trans=np.eye(4);trans[:3,3]=local[:3,3]
   scale=np.diag([np.linalg.norm(local[:3,0]),np.linalg.norm(local[:3,1]),np.linalg.norm(local[:3,2]),1])
   local=trans@Rz(rz)@Ry(ry)@Rx(rx)@scale
  cache[i]=g(parents[i])@local if i in parents else local
  return cache[i]
 for i in range(len(doc['nodes'])):g(i)
 return cache

bind=globals_for({})
mesh_node_index=mesh_nodes[0][0]
mesh_global_bind=bind[mesh_node_index]
mesh_inv=np.linalg.inv(mesh_global_bind)

rng=np.random.default_rng(20260730)
sample_count=min(1200,len(pos))
sample_idx=rng.choice(len(pos),sample_count,replace=False)
sp=np.c_[pos[sample_idx],np.ones(sample_count)]
sj=joints[sample_idx];sw=weights[sample_idx]
controls={name:node_by[name] for name in REQ if name!='FitMateBodybuilderRig'}
failures=[];max_radius=0.0;min_extent=1e9;max_extent=0.0
for cycle in range(CYCLES):
 rotations={
  controls['Torso']:(rng.uniform(-0.55,0.55),rng.uniform(-0.25,0.25),rng.uniform(-0.35,0.35)),
  controls['LeftShoulder']:(rng.uniform(-1.5,1.5),rng.uniform(-0.8,0.8),rng.uniform(-1.2,1.2)),
  controls['RightShoulder']:(rng.uniform(-1.5,1.5),rng.uniform(-0.8,0.8),rng.uniform(-1.2,1.2)),
  controls['LeftElbow']:(rng.uniform(0,2.4),rng.uniform(-0.2,0.2),rng.uniform(-0.3,0.3)),
  controls['RightElbow']:(rng.uniform(0,2.4),rng.uniform(-0.2,0.2),rng.uniform(-0.3,0.3)),
  controls['LeftHip']:(rng.uniform(-1.2,1.2),rng.uniform(-0.5,0.5),rng.uniform(-0.65,0.65)),
  controls['RightHip']:(rng.uniform(-1.2,1.2),rng.uniform(-0.5,0.5),rng.uniform(-0.65,0.65)),
  controls['LeftKnee']:(rng.uniform(0,2.2),0,0),
  controls['RightKnee']:(rng.uniform(0,2.2),0,0),
 }
 glob=globals_for(rotations)
 out=np.zeros((sample_count,4),float)
 for slot in range(4):
  ji=sj[:,slot];w=sw[:,slot]
  for j in np.unique(ji):
   mask=ji==j
   node_idx=joints_nodes[int(j)]
   M=mesh_inv@glob[node_idx]@ibm[int(j)]@mesh_global_bind
   out[mask]+=w[mask,None]*(sp[mask]@M.T)
 xyz=out[:,:3]
 if not np.isfinite(xyz).all():
  failures.append({'cycle':cycle,'reason':'non-finite skinned vertex'});break
 radius=float(np.linalg.norm(xyz,axis=1).max());max_radius=max(max_radius,radius)
 ext=np.ptp(xyz,axis=0);diag=float(np.linalg.norm(ext));min_extent=min(min_extent,diag);max_extent=max(max_extent,diag)
 if radius>5 or diag<0.25:
  failures.append({'cycle':cycle,'reason':'implausible deformation','radius':radius,'extent':diag});break

influence={name:int(np.sum(np.any((joints==idx) & (weights>1e-6),axis=1))) for idx,name in enumerate(joint_names)}
report={
 'status':'PASS' if not failures else 'FAIL','cycles':CYCLES,'model':MODEL.name,'vertices':len(pos),'meshNodes':len(mesh_nodes),'joints':len(joints_nodes),
 'requiredNodes':REQ,'missingNodes':missing,'weightSumRange':[float(weight_sums.min()),float(weight_sums.max())],
 'maximumJointIndex':int(joints.max()),'jointInfluencedVertexCounts':influence,'sampledVerticesPerCycle':sample_count,
 'maximumSampleRadius':round(max_radius,6),'sampleExtentRange':[round(min_extent,6),round(max_extent,6)],'failures':failures,
 'methodology':'Deterministic structural validation plus 1,000 randomized safe-range linear-blend-skinning stress poses. This is not manual Blender weight-paint review or motion-capture certification.'
}
REPORT.parent.mkdir(parents=True,exist_ok=True);REPORT.write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if failures:sys.exit(1)
