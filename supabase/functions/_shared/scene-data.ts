/**
 * Wire-format for `public.scene.scene_data` (JSONB) and Unity `GameStateManager` JSON.
 *
 * DB column `scene.scene_type` stays `"level" | "freebuild"` (catalog / permissions).
 * Unity `GameStateModel.sceneType` (LearnerBuild | InstructorBuild | LearnerPlay) lives
 * **inside** this JSON as `buildMode` — UI mode, not duplicated as a second DB enum.
 *
 * Aligns with Unity: GameStateModel + PhysicsObjectModel + PhysicsData.
 */

/** Vector3 as Unity JsonUtility serializes it. */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Matches Unity `PhysicsData` (prefer these keys in new payloads). */
export interface PhysicsData {
  mass: number;
  frictionCoefficient: number;
  /** Gravity air resistance / Rigidbody drag */
  airDrag?: number;
}

/**
 * Legacy sample used `physics.friction`. Normalize to `frictionCoefficient` when reading.
 */
export function normalizePhysics(p: unknown): PhysicsData {
  if (!p || typeof p !== "object") {
    return { mass: 1, frictionCoefficient: 0.5, airDrag: 0 };
  }
  const o = p as Record<string, unknown>;
  const mass = typeof o.mass === "number" ? o.mass : 1;
  const fc =
    typeof o.frictionCoefficient === "number"
      ? o.frictionCoefficient
      : typeof o.friction === "number"
      ? o.friction
      : 0.5;
  const airDrag = typeof o.airDrag === "number" ? o.airDrag : 0;
  return { mass, frictionCoefficient: fc, airDrag };
}

export interface PhysicsObjectModel {
  id: string;
  type: string;
  position: Vector3;
  scale: Vector3;
  rotation: Vector3;
  physics: PhysicsData;
}

/** Minimal shape when only object layout is stored (older clients). */
export interface SceneDataObjectsOnly {
  objects: PhysicsObjectModel[];
}

/**
 * Full saved state (Unity `GameStateModel` + objects).
 * Store this entire object in `scene.scene_data` OR split: metadata columns + objects-only — your choice.
 */
export interface GameStateModel {
  /** Optional; can mirror `scene.title` for offline snapshots */
  title?: string;
  /** Unity ModuleManager: Gravity | Friction | EnergyTransformation | SimpleMachines | Auto */
  moduleType: string;
  /**
   * Unity editor / play mode: LearnerBuild | InstructorBuild | LearnerPlay | Auto.
   * Renamed from ambiguous "sceneType" in API docs — DB uses `scene_type` for level vs freebuild only.
   */
  buildMode?: string;
  /**
   * @deprecated Prefer `buildMode`. Unity still serializes `sceneType` — accept either when parsing.
   */
  sceneType?: string;
  /** Friction map index or Energy stage index; 0 if unused */
  variantIndex: number;
  objects: PhysicsObjectModel[];
}

/** Union of acceptable `scene_data` shapes from clients */
export type SceneDataJson = GameStateModel | SceneDataObjectsOnly | Record<string, unknown>;

export function isGameStateModel(v: unknown): v is GameStateModel {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.moduleType === "string" &&
    typeof o.variantIndex === "number" &&
    Array.isArray(o.objects)
  );
}

/** Normalize Unity JSON that uses `sceneType` into a single `buildMode` for APIs */
export function getBuildMode(data: GameStateModel): string | undefined {
  return data.buildMode ?? data.sceneType;
}
