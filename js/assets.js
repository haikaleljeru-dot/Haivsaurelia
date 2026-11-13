/* =====================================================================
   MANIFESTE DES ASSETS — chemins relatifs (remplacés par des data-URI
   dans la version autonome générée par build.py)
   ===================================================================== */
window.ASSET_MANIFEST = window.ASSET_MANIFEST || {
  // Sprites HD (nouveaux, détourés proprement)
  aur_idle: "assets/sprites/aur_idle.webp",
  aur_kick: "assets/sprites/aur_kick.webp",
  aur_slash: "assets/sprites/aur_slash.webp",
  aur_ult: "assets/sprites/aur_ult.webp",
  aur_hit: "assets/sprites/aur_hit.webp",
  hai_idle: "assets/sprites/hai_idle.webp",
  hai_kick: "assets/sprites/hai_kick.webp",
  hai_punch: "assets/sprites/hai_punch.webp",
  hai_ult: "assets/sprites/hai_ult.webp",
  hai_hit: "assets/sprites/hai_hit.webp",
  // Sprites classiques v1 (jeu original)
  v1_aur_idle: "assets/sprites_v1/aur_idle.webp",
  v1_aur_kick: "assets/sprites_v1/aur_kick.webp",
  v1_aur_slash: "assets/sprites_v1/aur_slash.webp",
  v1_aur_ult: "assets/sprites_v1/aur_ult.webp",
  v1_hai_idle: "assets/sprites_v1/hai_idle.webp",
  v1_hai_kick: "assets/sprites_v1/hai_kick.webp",
  v1_hai_punch: "assets/sprites_v1/hai_punch.webp",
  v1_hai_ult: "assets/sprites_v1/hai_ult.webp",
  // Arènes
  stage_paris: "assets/stages/stage_paris.webp",
  stage_jerusalem: "assets/stages/stage_jerusalem.webp",
  stage_singularity: "assets/stages/stage_singularity.webp",
  // Portraits
  aur_cyber: "assets/portraits/aur_cyber.webp",
  aur_real: "assets/portraits/aur_real.webp",
  hai_cyber: "assets/portraits/hai_cyber.webp",
  hai_real: "assets/portraits/hai_real.webp",
  couple: "assets/portraits/couple.webp",
  // Cinématiques
  cine_fracture: "assets/cinematics/cine_intro_01_fracture.webp",
  cine_aurelia: "assets/cinematics/cine_intro_02_aurelia_paris.webp",
  cine_hai: "assets/cinematics/cine_intro_03_hai_jerusalem.webp",
  cine_singularity: "assets/cinematics/cine_intro_04_singularity.webp",
  vs_poster: "assets/cinematics/vs_poster.webp",
  ending_aurelia: "assets/cinematics/ending_aurelia.webp",
  ending_hai: "assets/cinematics/ending_hai.webp",
  xray_aurelia: "assets/cinematics/xray_aurelia.webp",
  xray_hai: "assets/cinematics/xray_hai.webp",
  // Fatalities
  fat_aur_1: "assets/fatalities/fatality_aur_1.webp",
  fat_aur_2: "assets/fatalities/fatality_aur_2.webp",
  fat_hai_1: "assets/fatalities/fatality_hai_1.webp",
  fat_hai_2: "assets/fatalities/fatality_hai_2.webp",
  // Planches
  planche_aurelia: "assets/ui/planche_aurelia.webp",
  planche_hai: "assets/ui/planche_hai.webp"
};
// Vidéos cinématiques MP4 (768×432, H.264) — data-URI dans la version autonome
window.VIDEO_MANIFEST = window.VIDEO_MANIFEST || {
  vid_intro_fracture: "assets/videos/vid_intro_fracture.mp4",
  vid_aurelia_paris: "assets/videos/vid_aurelia_paris.mp4",
  vid_hai_jerusalem: "assets/videos/vid_hai_jerusalem.mp4",
  vid_vs_clash: "assets/videos/vid_vs_clash.mp4",
  vid_singularity: "assets/videos/vid_singularity.mp4",
  vid_ending_aurelia: "assets/videos/vid_ending_aurelia.mp4",
  vid_ending_hai: "assets/videos/vid_ending_hai.mp4",
  vid_fatality_aurelia: "assets/videos/vid_fatality_aurelia.mp4",
  vid_fatality_hai: "assets/videos/vid_fatality_hai.mp4"
};
// Infos d'affichage des vidéos (galerie, vignettes, narration associée)
const VIDEO_INFO = {
  vid_intro_fracture: { title: "La Fracture du Multivers", thumb: "cine_fracture", voices: ["cine_intro_0_0"] },
  vid_aurelia_paris: { title: "L'Ombre de Cyber-Paris", thumb: "cine_aurelia", voices: ["cine_intro_1_0", "cine_intro_1_1"] },
  vid_hai_jerusalem: { title: "L'Archonte de Néo-Jérusalem", thumb: "cine_hai", voices: ["cine_intro_2_0", "cine_intro_2_1"] },
  vid_vs_clash: { title: "Le Choc des Titans — VS", thumb: "vs_poster", voices: ["cine_intro_4_0", "cine_intro_4_1"] },
  vid_singularity: { title: "L'Œil de la Singularité", thumb: "cine_singularity", voices: ["cine_intro_3_0", "cine_intro_3_1"] },
  vid_ending_aurelia: { title: "Fin — L'Impératrice de l'Éclipse", thumb: "ending_aurelia", voices: ["cine_ending_aurelia_2_0", "cine_ending_aurelia_2_1"] },
  vid_ending_hai: { title: "Fin — L'Archonte de la Merkabah", thumb: "ending_hai", voices: ["cine_ending_hai_2_0", "cine_ending_hai_2_1"] },
  vid_fatality_aurelia: { title: "Fatality — Aurélia", thumb: "fat_aur_1", voices: ["aur_fat", "ann_fatality"] },
  vid_fatality_hai: { title: "Fatality — Haï", thumb: "fat_hai_1", voices: ["hai_fat", "ann_fatality"] }
};
