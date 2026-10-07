// Deixa só a textura de cor (e emissiva) nos personagens: tira normal, metal/rugosidade e oclusão.
// No celular (iPhone!) cada textura 1024 vira ~5,6 MB de RAM de GPU; os bonecos são minúsculos na tela,
// então esses mapas extras não aparecem mas quase derrubavam o Safari. uso: node texturas_leves.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
const [, , ent, sai] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(ent);
let tirados = 0;
for (const m of doc.getRoot().listMaterials()) {
  if (m.getNormalTexture()) { m.setNormalTexture(null); tirados++; }
  if (m.getOcclusionTexture()) { m.setOcclusionTexture(null); tirados++; }
  if (m.getMetallicRoughnessTexture()) { m.setMetallicRoughnessTexture(null); tirados++; }
  m.setMetallicFactor(0); m.setRoughnessFactor(Math.max(0.7, m.getRoughnessFactor()));
  for (const ext of m.listExtensions()) { const n = ext.extensionName; if (/specular|clearcoat|sheen|transmission|iridescence|anisotropy/i.test(n)) m.setExtension(n, null); }
}
await doc.transform(prune());
await io.write(sai, doc);
console.log('texturas extras removidas:', tirados, '| restantes:', doc.getRoot().listTextures().length);
