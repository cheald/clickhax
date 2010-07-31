/*
 clickhax - a node.js/mongo click heatmap solution

 Original by xxx (http://github.com/xxx/heatmap), MIT License
 
 Copyright (c) 2010 xxx, Chris Heald

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 
******************************************/
 
(function ($) {
  var heat = {},
      canvasWidth,
      canvasHeight,
      context,
			canvas,
      cache = { toHue: {}, hueToRGB: {} },
      renderHeat,
      toHue,
      hueToRGB,
      renderStartTime,
			normalizeHeat;
			
	/* Effectively a grayscale 9x9 image to be used to paint both opacity and heat
	   If you'd like to generate an array from your own image (of any size as long as it's square), use something like the following:
		 
		var img = new Image();
		var dim = 9;		// Width of the image
		var imgd;
		img.src = "hm.png";
		img.onload = function() {
			context.drawImage(img, 0, 0, dim, dim, 0, 0, dim, dim);
			console.log(context.getImageData(0, 0, dim, dim).data);
		}		 
	*/
	
  var clickMask = [2, 7, 18, 34, 47, 40, 23, 10, 3, 5, 20, 63, 123, 157, 143, 90, 37, 10, 11, 53, 146, 212, 230, 224, 184, 91, 25, 18, 86, 198, 238, 241, 240, 224, 145, 41, 22, 97, 208, 239, 241, 241, 231, 158, 46, 18, 86, 198, 238, 241, 240, 224, 145, 41, 11, 53, 146, 212, 230, 224, 184, 91, 25, 5, 20, 63, 123, 157, 143, 90, 37, 10, 2, 7, 18, 34, 47, 40, 23, 10, 3];
	var clickWidth = Math.sqrt(clickMask.length);
	
  applyMask = function (heat) {
    var key, i, j, initialI, initialJ, maskSeg;
		var newheat = {};

    maskSeg = Math.floor(clickWidth / 2);
		for (key in heat) {
			var x = Math.floor(key / 3000);
			var y = key % 3000;

			initialI = x - maskSeg;
			initialJ = y - maskSeg;

			for (i = initialI; i <= x + maskSeg; i += 1) {
				if (i < 0 || i >= canvasWidth) { continue; }

				for (j = initialJ; j <= y + maskSeg; j += 1) {
					if (j < 0 || j >= canvasHeight) { continue; }
					key = i * 3000 + j;
					newheat[key] = newheat[key] || (heat[key] && heat[key]) || 0;
					var idx = ((j - initialJ) + (i - initialI) * clickWidth);
					newheat[key] += Math.floor(clickMask[idx]);
				}
			}
		}
		return newheat;
  };

  normalizeHeat = function (heat) {
    var minHeat, maxHeat, heatValues = [], normalizedHeat = {}, denominator, key;

    for (key in heat) { heatValues.push(heat[key]); }
    minHeat = Math.min.apply(this, heatValues);
    maxHeat = Math.max.apply(this, heatValues);
    denominator = maxHeat - minHeat;
    if (denominator === 0 || denominator === Number.NEGATIVE_INFINITY) { denominator = 1; }
    for (key in heat) { normalizedHeat[key] = Math.floor(255 * ((heat[key] - minHeat) / denominator)); }
    return normalizedHeat;
  };

  renderHeat = function (heat) {
    var x, y, splitKey, rgb;

		heat = applyMask(heat);
		heat = normalizeHeat(heat);
		
		context.fillStyle = "rgb(116, 119, 130)";
    context.clearRect(0, 0, canvasWidth, canvasHeight);
		context.fillRect(0, 0, canvasWidth, canvasHeight);

    $.each(heat, function (key, value) {
			if(value != 0) {
				key = parseInt(key);
				y = key % 3000;
				x = Math.floor(key / 3000);

				rgb = hueToRGB(toHue(value), 1, 1);

				context.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + value / 16 + ")";
				context.fillRect(x, y, 1, 1);
			}
    });
    canvas.css({opacity: 0}).show().animate({opacity: 0.5}, 350);
  };

  /*
   * take normalized heat value from above and
   * convert it to a 0 (red, hot) - 240 (blue, cold) range.
   * we assume the passed normalized values are
   *  0 (cold) - 255 (hot)
   */
  toHue = function (value) {
    if (cache.toHue[value]) { return cache.toHue[value]; }
    cache.toHue[value] = 240 - Math.floor((value * 240) / 255);
    return cache.toHue[value];
  };

  /*
   * HSV to RGB color conversion
   *
   * pulled from http://snipplr.com/view.php?codeview&id=14590
   *
   * h: 0-360 , whole numbers
   * s: 0-1, decimals ok
   * v: 0-1, decimals ok
   */
  hueToRGB = function (h, s, v) {
    var r, g, b, i, f, p, q, t, cachekey = h + "/" + s + "/" + v;

    if (cache.hueToRGB[cachekey]) { return cache.hueToRGB[cachekey]; }

    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));

     // Achromatic (grey)
    if (s === 0) {
      r = g = b = v;
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));

    switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;

    case 1:
      r = q;
      g = v;
      b = p;
      break;

    case 2:
      r = p;
      g = v;
      b = t;
      break;

    case 3:
      r = p;
      g = q;
      b = v;
      break;

    case 4:
      r = t;
      g = p;
      b = v;
      break;

    default: // case 5:
      r = v;
      g = p;
      b = q;
    }

    cache.hueToRGB[cachekey] = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    return cache.hueToRGB[cachekey];
  };
	
	var defaults = {
		endpoint: window.location.protocol + "//" + window.location.hostname + ":3123",
		trigger: null
	}

	$.fn.clickhax = function(settings) {

		canvas = $('#heatmapOverlay');
		if(canvas.length == 0) {
			$("body").append("<canvas id='heatmapOverlay' style='position: absolute; top: 0; left: 0; right: 0, bottom: 0; display: none;'>This requires canvas support.</canvas>");
			canvas = $('#heatmapOverlay');
			canvas.click(function() { canvas.fadeOut('fast'); });
			if(!context) { context = canvas.get(0).getContext('2d'); }
		}
	
		var options = $.extend({}, defaults, settings);
		return this.each(function() {
			var tracker = this;
			$(this).mousedown(function(e) {
				var off = $(this).offset();
				$.post(options.endpoint, {x: e.pageX - off.left, y: e.pageY - off.top});
			});
			
			if(options.trigger) {
				$(options.trigger).click(function() {
					var $e = $(tracker);
					var off = $e.offset()
					var w = $e.width() + parseInt($e.css("padding-left")) + parseInt($e.css("padding-right")) + parseInt($e.css("borderLeftWidth")) + parseInt($e.css("borderRightWidth"));
					var h = $e.height() + parseInt($e.css("padding-top")) + parseInt($e.css("padding-bottom")) + parseInt($e.css("borderTopWidth")) + parseInt($e.css("borderBottomWidth"));
					canvas.attr({
						width: w,
						height: h
					}).css({
						top: off.top + "px",
						left: off.left + "px"
					});

					canvasWidth = canvas.width();
					canvasHeight = canvas.width();

					$.getJSON(options.endpoint, function(data) { renderHeat(data); });
					return false;
				});
			}			
		});
	};
})(jQuery);