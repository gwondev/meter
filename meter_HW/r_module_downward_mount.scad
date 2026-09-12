// METER R모듈 하향 카메라 거치 (기능 출력용 — 꾸미기 전)
// 데드라인: 2026-10-10 까지 IT융합대학 무료 출력 → 동방 픽업 → 검토회의
//
// 의도:
//  - 카메라가 바닥(용기 안)을 내려다보게 고정
//  - D모듈처럼 용기 테두리에 걸치는 클립 + 수직 암
//  - r1=성권 테스트, r2/r3=수혁 담당 보드용 (기구는 동일 계열)
//
// 출력: OpenSCAD → STL → 슬라이서. 필라멘트 PLA 권장.
//   openscad -o r_downward_mount.stl r_module_downward_mount.scad

$fn = 48;

/* ===== 조절 파라미터 (보드·렌즈에 맞게) ===== */
clip_gap      = 18;   // 용기 림 두께 여유 (mm)
clip_depth    = 28;   // 림을 물고 들어가는 깊이
clip_width    = 42;
clip_thick    = 4;

arm_len       = 90;   // 아래로 뻗는 암 길이
arm_thick     = 6;
arm_width     = 22;

cam_plate_w   = 36;   // 카메라 플레이트
cam_plate_h   = 36;
cam_plate_t   = 3;
hole_pitch    = 20;   // M2 홀 간격 (보드에 맞게 수정)
hole_d        = 2.3;

module rim_clip() {
  // ㄷ자 클립 — D모듈 거치와 비슷한 '테두리 걸침'
  difference() {
    cube([clip_width, clip_depth + clip_thick * 2, clip_gap + clip_thick * 2], center = false);
    translate([-1, clip_thick, clip_thick])
      cube([clip_width + 2, clip_depth, clip_gap], center = false);
  }
}

module down_arm() {
  // 클립에서 수직으로 내려가는 암
  translate([clip_width / 2 - arm_width / 2, 0, -(arm_len)])
    cube([arm_width, arm_thick, arm_len]);
}

module camera_plate() {
  // 암이 끝나는 지점에서 바닥을 향하도록 플레이트 (카메라 렌즈 ↓)
  translate([
    clip_width / 2 - cam_plate_w / 2,
    arm_thick,
    -(arm_len + cam_plate_t)
  ])
  difference() {
    cube([cam_plate_w, cam_plate_h, cam_plate_t]);
    // 4홀
    for (x = [cam_plate_w / 2 - hole_pitch / 2, cam_plate_w / 2 + hole_pitch / 2])
      for (y = [cam_plate_h / 2 - hole_pitch / 2, cam_plate_h / 2 + hole_pitch / 2])
        translate([x, y, -1])
          cylinder(h = cam_plate_t + 2, d = hole_d);
    // 렌즈 개구
    translate([cam_plate_w / 2, cam_plate_h / 2, -1])
      cylinder(h = cam_plate_t + 2, d = 12);
  }
}

module brace() {
  // 암-클립 보강 삼각
  translate([clip_width / 2 - 1.5, 0, 0])
    rotate([90, 0, 90])
      linear_extrude(height = 3)
        polygon([[0, 0], [arm_thick + 8, 0], [0, -22]]);
}

union() {
  rim_clip();
  down_arm();
  camera_plate();
  brace();
}

// 미리보기용 안내 텍스트는 STL에 포함하지 않음
echo("METER R downward mount — print by 2026-10-10");
