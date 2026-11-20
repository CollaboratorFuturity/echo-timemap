/* ================= CAMERA RIG =================
   Pure helpers for the TimeMap camera. TimeMap.jsx owns the state and the
   input handlers; the math lives here so it can be checked on its own.

   The camera state is an "orbit" object:
     theta  azimuth in radians; 0 = camera due south of the target, so north is up the screen
     phi    elevation above the horizon in radians (fixed at TILT, 45 degrees)
     dist   camera distance from the look-at point
     tx,tz  look-at offset from the base target (baseX, baseZ), in scene units
   The camera always looks at (baseX + tx, LOOK_Y, baseZ + tz).

   Controls: left-drag pans (grab the ground), right-drag rotates theta.
   Elevation is locked, so no input changes phi.
   ============================================== */
import * as THREE from "three";

export const TILT = Math.PI / 4;   // fixed camera elevation: 45 degrees
export const LOOK_Y = 4.5;         // height of the point the camera looks at
export const DRAG_PX = 4;          // mouse / pen movement below this is a click, not a drag
export const DRAG_PX_TOUCH = 10;   // fingers wobble more

// Horizontal plane at height y, for grabbing the map surface.
export function groundPlane(y) { return new THREE.Plane(new THREE.Vector3(0, 1, 0), -y); }

// Put `cam` where the orbit state says it should be.
export function placeCamera(cam, o, baseX, baseZ) {
  const c = Math.cos(o.phi);
  cam.position.set(baseX + o.tx + o.dist * Math.sin(o.theta) * c, o.dist * Math.sin(o.phi), baseZ + o.tz + o.dist * Math.cos(o.theta) * c);
  cam.lookAt(baseX + o.tx, LOOK_Y, baseZ + o.tz);
}

// A copy of the camera frozen at the start of a drag. Pan is computed against this
// frozen view, so repeated pointer events between frames cannot compound.
export function snapshotCamera(cam, o, baseX, baseZ) {
  const c = new THREE.PerspectiveCamera(cam.fov, cam.aspect, cam.near, cam.far);
  placeCamera(c, o, baseX, baseZ);
  c.updateMatrixWorld(true);
  return c;
}

const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();

// Where the cursor (normalized device coordinates, -1..1) meets `plane` as seen from `cam`.
// Returns `out`, or null if the ray never reaches the plane.
export function groundHit(cam, ndcX, ndcY, plane, out) {
  _ndc.set(ndcX, ndcY);
  _ray.setFromCamera(_ndc, cam);
  return _ray.ray.intersectPlane(plane, out);
}

// Grab-the-ground pan. `grab` is the ground point that was under the cursor when the
// drag began. Returns the look-at offset that puts it under the cursor now, or null.
export function panTarget(startCam, grab, ndcX, ndcY, plane, start) {
  const now = groundHit(startCam, ndcX, ndcY, plane, new THREE.Vector3());
  if (!grab || !now) return null;
  return { tx: start.tx + (grab.x - now.x), tz: start.tz + (grab.z - now.z) };
}

// Scene-space move for "right" and "forward" steps as seen on screen (used by the keyboard).
// At theta = 0: right = +x (east), forward = -z (north).
export function screenStep(theta, right, forward) {
  const s = Math.sin(theta), c = Math.cos(theta);
  return [right * c - forward * s, -right * s - forward * c];
}
