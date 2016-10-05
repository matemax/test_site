/* Copyright 2015 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/display/text_layer', ['exports', 'pdfjs/shared/util',
      'pdfjs/display/dom_utils'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'), require('./dom_utils.js'));
  } else {
    factory((root.pdfjsDisplayTextLayer = {}), root.pdfjsSharedUtil,
      root.pdfjsDisplayDOMUtils);
  }
}(this, function (exports, sharedUtil, displayDOMUtils) {

var Util = sharedUtil.Util;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var CustomStyle = displayDOMUtils.CustomStyle;
var getDefaultSetting = displayDOMUtils.getDefaultSetting;

/**
 * Text layer render parameters.
 *
 * @typedef {Object} TextLayerRenderParameters
 * @property {TextContent} textContent - Text content to render (the object is
 *   returned by the page's getTextContent() method).
 * @property {HTMLElement} container - HTML element that will contain text runs.
 * @property {PageViewport} viewport - The target viewport to properly
 *   layout the text runs.
 * @property {Array} textDivs - (optional) HTML elements that are correspond
 *   the text items of the textContent input. This is output and shall be
 *   initially be set to empty array.
 * @property {number} timeout - (optional) Delay in milliseconds before
 *   rendering of the text  runs occurs.
 */
var renderTextLayer = (function renderTextLayerClosure() {
  var MAX_TEXT_DIVS_TO_RENDER = 100000;

  var NonWhitespaceRegexp = /\S/;

  function isAllWhitespace(str) {
    return !NonWhitespaceRegexp.test(str);
  }

  function appendText(textDivs, viewport, geom, styles, bounds,
                      enhanceTextSelection) {
    var style = styles[geom.fontName];
    var textDiv = document.createElement('div');
    textDivs.push(textDiv);
    if (isAllWhitespace(geom.str)) {
      textDiv.dataset.isWhitespace = true;
      return;
    }
    var tx = Util.transform(viewport.transform, geom.transform);
    var angle = Math.atan2(tx[1], tx[0]);
    if (style.vertical) {
      angle += Math.PI / 2;
    }
    var fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
    var fontAscent = fontHeight;
    if (style.ascent) {
      fontAscent = style.ascent * fontAscent;
    } else if (style.descent) {
      fontAscent = (1 + style.descent) * fontAscent;
    }

    var left;
    var top;
    if (angle === 0) {
      left = tx[4];
      top = tx[5] - fontAscent;
    } else {
      left = tx[4] + (fontAscent * Math.sin(angle));
      top = tx[5] - (fontAscent * Math.cos(angle));
    }
    textDiv.style.left = left + 'px';
    textDiv.style.top = top + 'px';
    textDiv.style.fontSize = fontHeight + 'px';
    textDiv.style.fontFamily = style.fontFamily;

    textDiv.textContent = geom.str;
    // |fontName| is only used by the Font Inspector. This test will succeed
    // when e.g. the Font Inspector is off but the Stepper is on, but it's
    // not worth the effort to do a more accurate test.
    if (getDefaultSetting('pdfBug')) {
      textDiv.dataset.fontName = geom.fontName;
    }
    // Storing into dataset will convert number into string.
    if (angle !== 0) {
      textDiv.dataset.angle = angle * (180 / Math.PI);
    }
    // We don't bother scaling single-char text divs, because it has very
    // little effect on text highlighting. This makes scrolling on docs with
    // lots of such divs a lot faster.
    if (geom.str.length > 1) {
      if (style.vertical) {
        textDiv.dataset.canvasWidth = geom.height * viewport.scale;
      } else {
        textDiv.dataset.canvasWidth = geom.width * viewport.scale;
      }
    }
    if (enhanceTextSelection) {
      var angleCos = 1, angleSin = 0;
      if (angle !== 0) {
        angleCos = Math.cos(angle);
        angleSin = Math.sin(angle);
      }
      var divWidth = (style.vertical ? geom.height : geom.width) *
                     viewport.scale;
      var divHeight = fontHeight;

      var m, b;
      if (angle !== 0) {
        m = [angleCos, angleSin, -angleSin, angleCos, left, top];
        b = Util.getAxialAlignedBoundingBox([0, 0, divWidth, divHeight], m);
      } else {
        b = [left, top, left + divWidth, top + divHeight];
      }

      bounds.push({
        left: b[0],
        top: b[1],
        right: b[2],
        bottom: b[3],
        div: textDiv,
        size: [divWidth, divHeight],
        m: m
      });
    }
  }

  function render(task) {
    if (task._canceled) {
      return;
    }
    var textLayerFrag = task._container;
    var textDivs = task._textDivs;
    var capability = task._capability;
    var textDivsLength = textDivs.length;

    // No point in rendering many divs as it would make the browser
    // unusable even after the divs are rendered.
    if (textDivsLength > MAX_TEXT_DIVS_TO_RENDER) {
      task._renderingDone = true;
      capability.resolve();
      return;
    }

    var canvas = document.createElement('canvas');
//#if MOZCENTRAL || FIREFOX || GENERIC
    canvas.mozOpaque = true;
//#endif
    var ctx = canvas.getContext('2d', {alpha: false});

    var lastFontSize;
    var lastFontFamily;
    for (var i = 0; i < textDivsLength; i++) {
      var textDiv = textDivs[i];
      if (textDiv.dataset.isWhitespace !== undefined) {
        continue;
      }

      var fontSize = textDiv.style.fontSize;
      var fontFamily = textDiv.style.fontFamily;

      // Only build font string and set to context if different from last.
      if (fontSize !== lastFontSize || fontFamily !== lastFontFamily) {
        ctx.font = fontSize + ' ' + fontFamily;
        lastFontSize = fontSize;
        lastFontFamily = fontFamily;
      }

      var width = ctx.measureText(textDiv.textContent).width;
      textDiv.dataset.originalWidth = width;
      textLayerFrag.appendChild(textDiv);

      var transform;
      if (textDiv.dataset.canvasWidth !== undefined && width > 0) {
        // Dataset values are of type string.
        var textScale = textDiv.dataset.canvasWidth / width;
        transform = 'scaleX(' + textScale + ')';
      } else {
        transform = '';
      }
      var rotation = textDiv.dataset.angle;
      if (rotation) {
        transform = 'rotate(' + rotation + 'deg) ' + transform;
      }
      if (transform) {
        textDiv.dataset.originalTransform = transform;
        CustomStyle.setProp('transform' , textDiv, transform);
      }
    }
    task._renderingDone = true;
    capability.resolve();
  }

  function expand(bounds, viewport) {
    var expanded = expandBounds(viewport.width, viewport.height, bounds);
    for (var i = 0; i < expanded.length; i++) {
      var div = bounds[i].div;
      if (!div.dataset.angle) {
        div.dataset.paddingLeft = bounds[i].left - expanded[i].left;
        div.dataset.paddingTop = bounds[i].top - expanded[i].top;
        div.dataset.paddingRight = expanded[i].right - bounds[i].right;
        div.dataset.paddingBottom = expanded[i].bottom - bounds[i].bottom;
        continue;
      }
      // Box is rotated -- trying to find padding so rotated div will not
      // exceed its expanded bounds.
      var e = expanded[i], b = bounds[i];
      var m = b.m, c = m[0], s = m[1];
      // Finding intersections with expanded box.
      var points = [[0, 0], [0, b.size[1]], [b.size[0], 0], b.size];
      var ts = new Float64Array(64);
      points.forEach(function (p, i) {
        var t = Util.applyTransform(p, m);
        ts[i + 0] = c && (e.left - t[0]) / c;
        ts[i + 4] = s && (e.top - t[1]) / s;
        ts[i + 8] = c && (e.right - t[0]) / c;
        ts[i + 12] = s && (e.bottom - t[1]) / s;

        ts[i + 16] = s && (e.left - t[0]) / -s;
        ts[i + 20] = c && (e.top - t[1]) / c;
        ts[i + 24] = s && (e.right - t[0]) / -s;
        ts[i + 28] = c && (e.bottom - t[1]) / c;

        ts[i + 32] = c && (e.left - t[0]) / -c;
        ts[i + 36] = s && (e.top - t[1]) / -s;
        ts[i + 40] = c && (e.right - t[0]) / -c;
        ts[i + 44] = s && (e.bottom - t[1]) / -s;

        ts[i + 48] = s && (e.left - t[0]) / s;
        ts[i + 52] = c && (e.top - t[1]) / -c;
        ts[i + 56] = s && (e.right - t[0]) / s;
        ts[i + 60] = c && (e.bottom - t[1]) / -c;
      });
      var findPositiveMin = function (ts, offset, count) {
        var result = 0;
        for (var i = 0; i < count; i++) {
          var t = ts[offset++];
          if (t > 0) {
            result = result ? Math.min(t, result) : t;
          }
        }
        return result;
      };
      // Not based on math, but to simplify calculations, using cos and sin
      // absolute values to not exceed the box (it can but insignificantly).
      var boxScale = 1 + Math.min(Math.abs(c), Math.abs(s));
      div.dataset.paddingLeft = findPositiveMin(ts, 32, 16) / boxScale;
      div.dataset.paddingTop = findPositiveMin(ts, 48, 16) / boxScale;
      div.dataset.paddingRight = findPositiveMin(ts, 0, 16) / boxScale;
      div.dataset.paddingBottom = findPositiveMin(ts, 16, 16) / boxScale;
    }
  }

  function expandBounds(width, height, boxes) {
    var bounds = boxes.map(function (box, i) {
      return {
        x1: box.left,
        y1: box.top,
        x2: box.right,
        y2: box.bottom,
        index: i,
        x1New: undefined,
        x2New: undefined
      };
    });
    expandBoundsLTR(width, bounds);
    var expanded = new Array(boxes.length);
    bounds.forEach(function (b) {
      var i = b.index;
      expanded[i] = {
        left: b.x1New,
        top: 0,
        right: b.x2New,
        bottom: 0
      };
    });

    // Rotating on 90 degrees and extending extended boxes. Reusing the bounds
    // array and objects.
    boxes.map(function (box, i) {
      var e = expanded[i], b = bounds[i];
      b.x1 = box.top;
      b.y1 = width - e.right;
      b.x2 = box.bottom;
      b.y2 = width - e.left;
      b.index = i;
      b.x1New = undefined;
      b.x2New = undefined;
    });
    expandBoundsLTR(height, bounds);

    bounds.forEach(function (b) {
      var i = b.index;
      expanded[i].top = b.x1New;
      expanded[i].bottom = b.x2New;
    });
    return expanded;
  }

  function expandBoundsLTR(width, bounds) {
    // Sorting by x1 coordinate and walk by the bounds in the same order.
    bounds.sort(function (a, b) { return a.x1 - b.x1 || a.index - b.index; });

    // First we see on the horizon is a fake boundary.
    var fakeBoundary = {
      x1: -Infinity,
      y1: -Infinity,
      x2: 0,
      y2: Infinity,
      index: -1,
      x1New: 0,
      x2New: 0
    };
    var horizon = [{
      start: -Infinity,
      end: Infinity,
      boundary: fakeBoundary
    }];

    bounds.forEach(function (boundary) {
      // Searching for the affected part of horizon.
      // TODO red-black tree or simple binary search
      var i = 0;
      while (i < horizon.length && horizon[i].end <= boundary.y1) {
        i++;
      }
      var j = horizon.length - 1;
      while(j >= 0 && horizon[j].start >= boundary.y2) {
        j--;
      }

      var horizonPart, affectedBoundary;
      var q, k, maxXNew = -Infinity;
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        var xNew;
        if (affectedBoundary.x2 > boundary.x1) {
          // In the middle of the previous element, new x shall be at the
          // boundary start. Extending if further if the affected bondary
          // placed on top of the current one.
          xNew = affectedBoundary.index > boundary.index ?
            affectedBoundary.x1New : boundary.x1;
        } else if (affectedBoundary.x2New === undefined) {
          // We have some space in between, new x in middle will be a fair
          // choice.
          xNew = (affectedBoundary.x2 + boundary.x1) / 2;
        } else {
          // Affected boundary has x2new set, using it as new x.
          xNew = affectedBoundary.x2New;
        }
        if (xNew > maxXNew) {
          maxXNew = xNew;
        }
      }

      // Set new x1 for current boundary.
      boundary.x1New = maxXNew;

      // Adjusts new x2 for the affected boundaries.
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        if (affectedBoundary.x2New === undefined) {
          // Was not set yet, choosing new x if possible.
          if (affectedBoundary.x2 > boundary.x1) {
            // Current and affected boundaries intersect. If affected boundary
            // is placed on top of the current, shrinking the affected.
            if (affectedBoundary.index > boundary.index) {
              affectedBoundary.x2New = affectedBoundary.x2;
            }
          } else {
            affectedBoundary.x2New = maxXNew;
          }
        } else if (affectedBoundary.x2New > maxXNew) {
          // Affected boundary is touching new x, pushing it back.
          affectedBoundary.x2New = Math.max(maxXNew, affectedBoundary.x2);
        }
      }

      // Fixing the horizon.
      var changedHorizon = [], lastBoundary = null;
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        // Checking which boundary will be visible.
        var useBoundary = affectedBoundary.x2 > boundary.x2 ?
          affectedBoundary : boundary;
        if (lastBoundary === useBoundary) {
          // Merging with previous.
          changedHorizon[changedHorizon.length - 1].end = horizonPart.end;
        } else {
          changedHorizon.push({
            start: horizonPart.start,
            end: horizonPart.end,
            boundary: useBoundary
          });
          lastBoundary = useBoundary;
        }
      }
      if (horizon[i].start < boundary.y1) {
        changedHorizon[0].start = boundary.y1;
        changedHorizon.unshift({
          start: horizon[i].start,
          end: boundary.y1,
          boundary: horizon[i].boundary
        });
      }
      if (boundary.y2 < horizon[j].end) {
        changedHorizon[changedHorizon.length - 1].end = boundary.y2;
        changedHorizon.push({
          start: boundary.y2,
          end: horizon[j].end,
          boundary: horizon[j].boundary
        });
      }

      // Set x2 new of boundary that is no longer visible (see overlapping case
      // above).
      // TODO more efficient, e.g. via reference counting.
      for (q = i; q <= j; q++) {
        horizonPart = horizon[q];
        affectedBoundary = horizonPart.boundary;
        if (affectedBoundary.x2New !== undefined) {
          continue;
        }
        var used = false;
        for (k = i - 1; !used && k >= 0 &&
        horizon[k].start >= affectedBoundary.y1; k--) {
          used = horizon[k].boundary === affectedBoundary;
        }
        for (k = j + 1; !used && k < horizon.length &&
        horizon[k].end <= affectedBoundary.y2; k++) {
          used = horizon[k].boundary === affectedBoundary;
        }
        for (k = 0; !used && k < changedHorizon.length; k++) {
          used = changedHorizon[k].boundary === affectedBoundary;
        }
        if (!used) {
          affectedBoundary.x2New = maxXNew;
        }
      }

      Array.prototype.splice.apply(horizon,
        [i, j - i + 1].concat(changedHorizon));
    });

    // Set new x2 for all unset boundaries.
    horizon.forEach(function (horizonPart) {
      var affectedBoundary = horizonPart.boundary;
      if (affectedBoundary.x2New === undefined) {
        affectedBoundary.x2New = Math.max(width, affectedBoundary.x2);
      }
    });
  }

  /**
   * Text layer rendering task.
   *
   * @param {TextContent} textContent
   * @param {HTMLElement} container
   * @param {PageViewport} viewport
   * @param {Array} textDivs
   * @param {boolean} enhanceTextSelection
   * @private
   */
  function TextLayerRenderTask(textContent, container, viewport, textDivs,
                               enhanceTextSelection) {
    this._textContent = textContent;
    this._container = container;
    this._viewport = viewport;
    textDivs = textDivs || [];
    this._textDivs = textDivs;
    this._renderingDone = false;
    this._canceled = false;
    this._capability = createPromiseCapability();
    this._renderTimer = null;
    this._bounds = [];
    this._enhanceTextSelection = !!enhanceTextSelection;
    this._expanded = false;
  }
  TextLayerRenderTask.prototype = {
    get promise() {
      return this._capability.promise;
    },

    cancel: function TextLayer_cancel() {
      this._canceled = true;
      if (this._renderTimer !== null) {
        clearTimeout(this._renderTimer);
        this._renderTimer = null;
      }
      this._capability.reject('canceled');
    },

    _render: function TextLayer_render(timeout) {
      var textItems = this._textContent.items;
      var styles = this._textContent.styles;
      var textDivs = this._textDivs;
      var viewport = this._viewport;
      var bounds = this._bounds;
      var enhanceTextSelection = this._enhanceTextSelection;

      for (var i = 0, len = textItems.length; i < len; i++) {
        appendText(textDivs, viewport, textItems[i], styles, bounds,
                   enhanceTextSelection);
      }

      if (!timeout) { // Render right away
        render(this);
      } else { // Schedule
        var self = this;
        this._renderTimer = setTimeout(function() {
          render(self);
          self._renderTimer = null;
        }, timeout);
      }
    },

    expandTextDivs: function TextLayer_expandTextDivs(expandDivs) {
      if (!this._enhanceTextSelection || !this._renderingDone) {
        return;
      }
      if (!this._expanded) {
        expand(this._bounds, this._viewport);
        this._expanded = true;
        this._bounds.length = 0;
      }
      if (expandDivs) {
        for (var i = 0, ii = this._textDivs.length; i < ii; i++) {
          var div = this._textDivs[i];
          var transform;
          var width = div.dataset.originalWidth;
          if (div.dataset.canvasWidth !== undefined && width > 0) {
            // Dataset values are of type string.
            var textScale = div.dataset.canvasWidth / width;
            transform = 'scaleX(' + textScale + ')';
          } else {
            transform = '';
          }
          var rotation = div.dataset.angle;
          if (rotation) {
            transform = 'rotate(' + rotation + 'deg) ' + transform;
          }
          if (div.dataset.paddingLeft) {
            div.style.paddingLeft =
              (div.dataset.paddingLeft / textScale) + 'px';
            transform += ' translateX(' +
              (-div.dataset.paddingLeft / textScale) + 'px)';
          }
          if (div.dataset.paddingTop) {
            div.style.paddingTop = div.dataset.paddingTop + 'px';
            transform += ' translateY(' + (-div.dataset.paddingTop) + 'px)';
          }
          if (div.dataset.paddingRight) {
            div.style.paddingRight =
            div.dataset.paddingRight / textScale + 'px';
          }
          if (div.dataset.paddingBottom) {
            div.style.paddingBottom = div.dataset.paddingBottom + 'px';
          }
          if (transform) {
            CustomStyle.setProp('transform' , div, transform);
          }
        }
      } else {
        for (i = 0, ii = this._textDivs.length; i < ii; i++) {
          div = this._textDivs[i];
          div.style.padding = 0;
          transform = div.dataset.originalTransform || '';
          CustomStyle.setProp('transform', div, transform);
        }
      }
    },
  };


  /**
   * Starts rendering of the text layer.
   *
   * @param {TextLayerRenderParameters} renderParameters
   * @returns {TextLayerRenderTask}
   */
  function renderTextLayer(renderParameters) {
    var task = new TextLayerRenderTask(renderParameters.textContent,
                                       renderParameters.container,
                                       renderParameters.viewport,
                                       renderParameters.textDivs,
                                       renderParameters.enhanceTextSelection);
    task._render(renderParameters.timeout);
    return task;
  }

  return renderTextLayer;
})();

exports.renderTextLayer = renderTextLayer;
}));
