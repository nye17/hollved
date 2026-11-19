import './styles/wechat-bgs.less';

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
var webglEnabled = require('webgl-enabled')();

import createNativeRenderer from './galaxy/render/renderer.js';
import ControlModeButton from './galaxy/controlModeButton.jsx';
import LoadingIndicator from './galaxy/loadingIndicator.jsx';
import Help from './galaxy/help.jsx';
import NoWebGL from './galaxy/noWebgl.jsx';
import appEvents from './galaxy/service/appEvents.js';

// Import the scene store for its downloadGraphRequested subscription.
import './galaxy/store/scene.js';

function WeChatBgsApp() {
  var containerRef = useRef(null);

  useEffect(function() {
    if (!webglEnabled) return;

    var nativeRenderer = createNativeRenderer(containerRef.current);

    // appConfig has already parsed the authored hash by the time this component
    // mounts. Start only the DESI graph; graphLoader filters it to BGS.
    appEvents.downloadGraphRequested.fire('desi');
    appEvents.queryChanged.fire();

    return function() {
      nativeRenderer.destroy();
    };
  }, []);

  if (!webglEnabled) return <NoWebGL />;

  return (
    <div>
      <div ref={containerRef} className='graph-full-size' />
      <div className='top-right-panel'>
        <div className='top-right-buttons'>
          <ControlModeButton />
          <div
            className='hud-btn'
            title='Reset to origin'
            onClick={function() { appEvents.resetToOrigin.fire(); }}
          >
            🌍
          </div>
        </div>
      </div>
      <LoadingIndicator />
      <Help />
    </div>
  );
}

createRoot(document.getElementById('app')).render(<WeChatBgsApp />);
