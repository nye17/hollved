// Lightweight no-op implementations used only by the standalone WeChat BGS build.

export function createAuxLayerStub() {
  return {
    dispose: function() {},
    setVisible: function() {},
    setRadarVisible: function() {},
    setGalaxyFrame: function() {},
    setOrigin: function() {},
    updateFade: function() {},
    updateVisibility: function() {}
  };
}

export function createLabelLayerStub() {
  return {
    add: function() { return null; },
    remove: function() {},
    dispose: function() {}
  };
}

export function createGlowMaterialStub() {
  return {
    uniforms: { uAlpha: { value: 0 } },
    dispose: function() {}
  };
}

export function makeRadarLabelStub() {
  return {
    visible: false,
    fillOpacity: 0,
    outlineOpacity: 0,
    position: { copy: function() { return this; }, multiplyScalar: function() { return this; } },
    quaternion: { copy: function() { return this; } },
    dispose: function() {}
  };
}
