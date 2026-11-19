var variant = (typeof __HOLLVD_VARIANT__ !== 'undefined') ? __HOLLVD_VARIANT__ : 'default';

var runtimeDataUrl = (typeof window !== 'undefined' && window.HOLLVED_DATA_URL)
  ? window.HOLLVED_DATA_URL
  : 'https://hsimonfroy.github.io/hollved-data/';

export default {
  dataUrl: runtimeDataUrl,
  variant: variant,

  // Special builds can restrict the survey data actually downloaded. The
  // normal HOLLVeD build leaves this null and therefore loads the full manifest.
  tracerAllowlist: variant === 'wechat-bgs' ? ['bgs'] : null,
  loadAuxiliary: variant !== 'wechat-bgs',
  loadDensities: variant !== 'wechat-bgs'
};
