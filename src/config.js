var variant = (typeof __HOLLVD_VARIANT__ !== 'undefined') ? __HOLLVD_VARIANT__ : 'default';

var runtimeDataUrl = (typeof window !== 'undefined' && window.HOLLVED_DATA_URL)
  ? window.HOLLVED_DATA_URL
  : 'https://hsimonfroy.github.io/hollved-data/';

var isWechatBgs = variant === 'wechat-bgs';

export default {
  dataUrl: runtimeDataUrl,
  variant: variant,

  // Special builds can restrict the survey data actually downloaded. The
  // normal HOLLVeD build leaves this null and therefore loads the full manifest.
  tracerAllowlist: isWechatBgs ? ['bgs'] : null,

  // The WeChat unit is intentionally just the DESI BGS point catalogue plus
  // camera controls. These flags let shared services avoid auxiliary requests.
  enableAuxLayers: !isWechatBgs,
  enableRadar: !isWechatBgs,
  enableDensities: !isWechatBgs
};
