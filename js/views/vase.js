/* vase.js — 3D "life vase" easter egg for Digital Totem
 * Revolves the valence profile curve into a 3D printable vase shape.
 * Height = time progression, radius = valence (offset from a base).
 * Requires Three.js (loaded on demand from CDN).
 *
 * Public API (window.VaseView):
 *   .init(data)  — pass event data; wires up the easter egg button
 */
(function (window, $) {
    // Feature flag: disable Life Vase if not enabled
    if (window.FEATURE_FLAGS && window.FEATURE_FLAGS.lifeVase === false) {
        return;
    }
    'use strict';

    var THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    var _data = [];
    var _modal = null;
    var _renderer = null;
    var _animId = null;

    /* ── Helpers ─────────────────────────────────────────────────────── */
    function scoredEvents(data) {
        var out = [];
        data.forEach(function (item) {
            if (item.type === 'prompt') return;
            if (!item.dateIso) return;
            if (item.valence == null && item.impact == null) return;
            var d = new Date(item.dateIso + 'T12:00:00');
            if (isNaN(d.getTime())) return;
            out.push({
                date: d,
                valence: item.valence != null ? item.valence : 0,
                impact: item.impact != null ? item.impact : 0.2,
                title: item.title || '',
                category: item.category || 'basic'
            });
        });
        out.sort(function (a, b) { return a.date - b.date; });
        return out;
    }

    /* Catmull-Rom interpolation for smooth profile */
    function catmullRom(points, segments) {
        if (points.length < 2) return points;
        var result = [];
        for (var i = 0; i < points.length - 1; i++) {
            var p0 = points[Math.max(i - 1, 0)];
            var p1 = points[i];
            var p2 = points[i + 1];
            var p3 = points[Math.min(i + 2, points.length - 1)];
            for (var s = 0; s < segments; s++) {
                var t = s / segments;
                var tt = t * t;
                var ttt = tt * t;
                var x = 0.5 * (
                    (2 * p1[0]) +
                    (-p0[0] + p2[0]) * t +
                    (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * tt +
                    (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * ttt
                );
                var y = 0.5 * (
                    (2 * p1[1]) +
                    (-p0[1] + p2[1]) * t +
                    (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * tt +
                    (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * ttt
                );
                result.push([x, y]);
            }
        }
        result.push(points[points.length - 1]);
        return result;
    }

    /* Category colours for vertex painting */
    var VASE_COLOURS = {
        life:    [0.18, 0.76, 0.49],
        work:    [0.15, 0.39, 0.92],
        passion: [0.96, 0.62, 0.04],
        pivotal: [0.94, 0.27, 0.27],
        basic:   [0.60, 0.60, 0.65]
    };

    function lerpColour(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    /* Build the 2D profile + colour map.
     * Returns { points: [[r,h],...], colourAtHeight: fn(h) -> [r,g,b] } */
    function buildProfile(events) {
        if (events.length < 2) return null;

        var BASE_RADIUS = 1.2;
        var VALENCE_SCALE = 0.8;
        var VASE_HEIGHT = 6;
        var WALL_THICKNESS = 0.12;
        var BOTTOM_THICKNESS = 0.15;

        var minDate = events[0].date.getTime();
        var maxDate = events[events.length - 1].date.getTime();
        var dateRange = maxDate - minDate || 1;

        /* Raw control points + colour stops */
        var controlPoints = [];
        var colourStops = []; /* { h, colour } */
        events.forEach(function (ev) {
            var t = (ev.date.getTime() - minDate) / dateRange;
            var h = BOTTOM_THICKNESS + t * (VASE_HEIGHT - BOTTOM_THICKNESS);
            var r = BASE_RADIUS + ev.valence * VALENCE_SCALE;
            r = Math.max(0.3, r);
            controlPoints.push([r, h]);
            colourStops.push({ h: h, colour: VASE_COLOURS[ev.category] || VASE_COLOURS.basic });
        });

        /* Colour lookup: interpolate between nearest stops */
        var colourAtHeight = function (h) {
            if (colourStops.length === 0) return [0.83, 0.77, 0.66];
            if (h <= colourStops[0].h) return colourStops[0].colour;
            if (h >= colourStops[colourStops.length - 1].h) return colourStops[colourStops.length - 1].colour;
            for (var i = 0; i < colourStops.length - 1; i++) {
                if (h >= colourStops[i].h && h <= colourStops[i + 1].h) {
                    var t = (h - colourStops[i].h) / (colourStops[i + 1].h - colourStops[i].h || 1);
                    return lerpColour(colourStops[i].colour, colourStops[i + 1].colour, t);
                }
            }
            return colourStops[colourStops.length - 1].colour;
        };

        /* Smooth the profile */
        var smooth = catmullRom(controlPoints, 12);

        /* Build full profile with bottom and hollow interior */
        var outer = [];
        var inner = [];

        outer.push([0, 0]);
        outer.push([smooth[0][0], 0]);

        smooth.forEach(function (pt) {
            outer.push([pt[0], pt[1]]);
        });

        var topR = smooth[smooth.length - 1][0];
        var topH = smooth[smooth.length - 1][1];
        outer.push([topR, topH]);
        outer.push([topR - WALL_THICKNESS, topH]);

        for (var i = smooth.length - 1; i >= 0; i--) {
            var ir = Math.max(0.15, smooth[i][0] - WALL_THICKNESS);
            inner.push([ir, smooth[i][1]]);
        }

        inner.push([inner[inner.length - 1][0], BOTTOM_THICKNESS]);
        inner.push([0, BOTTOM_THICKNESS]);

        return {
            points: outer.concat(inner),
            colourAtHeight: colourAtHeight
        };
    }

    /* ── STL export ──────────────────────────────────────────────────── */
    function meshToSTL(geometry) {
        var positions = geometry.getAttribute('position');
        var indices = geometry.getIndex();

        var triangles = indices ? indices.count / 3 : positions.count / 3;
        var header = new Uint8Array(80);
        var buffer = new ArrayBuffer(80 + 4 + triangles * 50);
        var view = new DataView(buffer);

        /* Header (80 bytes) + triangle count */
        view.setUint32(80, triangles, true);

        var offset = 84;
        for (var i = 0; i < triangles; i++) {
            var i0, i1, i2;
            if (indices) {
                i0 = indices.getX(i * 3);
                i1 = indices.getX(i * 3 + 1);
                i2 = indices.getX(i * 3 + 2);
            } else {
                i0 = i * 3;
                i1 = i * 3 + 1;
                i2 = i * 3 + 2;
            }

            var ax = positions.getX(i0), ay = positions.getY(i0), az = positions.getZ(i0);
            var bx = positions.getX(i1), by = positions.getY(i1), bz = positions.getZ(i1);
            var cx = positions.getX(i2), cy = positions.getY(i2), cz = positions.getZ(i2);

            /* Normal via cross product */
            var ux = bx - ax, uy = by - ay, uz = bz - az;
            var vx = cx - ax, vy = cy - ay, vz = cz - az;
            var nx = uy * vz - uz * vy;
            var ny = uz * vx - ux * vz;
            var nz = ux * vy - uy * vx;
            var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            nx /= len; ny /= len; nz /= len;

            view.setFloat32(offset, nx, true); offset += 4;
            view.setFloat32(offset, ny, true); offset += 4;
            view.setFloat32(offset, nz, true); offset += 4;

            view.setFloat32(offset, ax, true); offset += 4;
            view.setFloat32(offset, ay, true); offset += 4;
            view.setFloat32(offset, az, true); offset += 4;
            view.setFloat32(offset, bx, true); offset += 4;
            view.setFloat32(offset, by, true); offset += 4;
            view.setFloat32(offset, bz, true); offset += 4;
            view.setFloat32(offset, cx, true); offset += 4;
            view.setFloat32(offset, cy, true); offset += 4;
            view.setFloat32(offset, cz, true); offset += 4;

            view.setUint16(offset, 0, true); offset += 2;
        }

        return new Blob([buffer], { type: 'application/octet-stream' });
    }

    function downloadSTL(geometry) {
        var blob = meshToSTL(geometry);
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'life-vase.stl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }

    /* ── Three.js loader ─────────────────────────────────────────────── */
    var _threePromise = null;
    function loadThree() {
        if (window.THREE) return Promise.resolve(window.THREE);
        if (_threePromise) return _threePromise;

        _threePromise = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            /* Use UMD build so THREE is on window */
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
            script.onload = function () { resolve(window.THREE); };
            script.onerror = function () { reject(new Error('Failed to load Three.js')); };
            document.head.appendChild(script);
        });
        return _threePromise;
    }

    /* ── 3D Scene ────────────────────────────────────────────────────── */
    function buildScene(container, events, surface) {
        var T = window.THREE;
        var W = container.offsetWidth;
        var H = container.offsetHeight;

        /* Renderer */
        var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x0c0e18, 1);
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        /* Scene */
        var scene = new T.Scene();
        scene.fog = new T.Fog(0x0c0e18, 12, 25);

        /* Camera */
        var camera = new T.PerspectiveCamera(40, W / H, 0.1, 100);
        var cameraTarget = new T.Vector3(0, 2.8, 0);

        /* Lights */
        var ambient = new T.AmbientLight(0x404060, 0.8);
        scene.add(ambient);

        var key = new T.DirectionalLight(0xffeedd, 1.2);
        key.position.set(4, 8, 6);
        scene.add(key);

        var fill = new T.DirectionalLight(0x8888cc, 0.4);
        fill.position.set(-3, 2, -4);
        scene.add(fill);

        var rim = new T.PointLight(0x2ec27e, 0.6, 15);
        rim.position.set(-2, 6, -3);
        scene.add(rim);

        /* Build vase geometry */
        var profileData = buildProfile(events);
        if (!profileData || profileData.points.length < 4) return null;

        /* Convert to Three.js Vector2 array for LatheGeometry */
        var points = [];
        profileData.points.forEach(function (p) {
            points.push(new T.Vector2(p[0], p[1]));
        });

        var geometry = new T.LatheGeometry(points, 64);
        geometry.computeVertexNormals();

        /* Apply vertex colours based on category at each height */
        var positions = geometry.getAttribute('position');
        var colors = new Float32Array(positions.count * 3);
        for (var vi = 0; vi < positions.count; vi++) {
            var y = positions.getY(vi);
            var c = profileData.colourAtHeight(y);
            colors[vi * 3]     = c[0];
            colors[vi * 3 + 1] = c[1];
            colors[vi * 3 + 2] = c[2];
        }
        geometry.setAttribute('color', new T.BufferAttribute(colors, 3));


        // Default material options
        var materialOptions = {
            vertexColors: true,
            roughness: 0.45,
            metalness: 0.05,
            clearcoat: 0.4,
            clearcoatRoughness: 0.3,
            side: T.DoubleSide,
            transparent: true,
            opacity: 0.92
        };


        // Stronger, geometry-based surface effects for 3D printing
        var pos = geometry.getAttribute('position');
        if (surface === 'ridges') {
            // Deep wheel ridges
            for (var i = 0; i < pos.count; i++) {
                var y = pos.getY(i);
                var r = Math.sqrt(pos.getX(i)*pos.getX(i) + pos.getZ(i)*pos.getZ(i));
                var freq = 12, amp = 0.18; // much deeper
                var offset = Math.sin(y * freq) * amp;
                var scale = 1 + offset / (r+0.01);
                pos.setX(i, pos.getX(i) * scale);
                pos.setZ(i, pos.getZ(i) * scale);
            }
            pos.needsUpdate = true;
        } else if (surface === 'hand') {
            // Strong hand-thrown: large random noise
            for (var i = 0; i < pos.count; i++) {
                var y = pos.getY(i);
                var n = (Math.sin(y * 7.3 + pos.getX(i) * 2.1) + Math.cos(y * 5.1 + pos.getZ(i) * 3.7)) * 0.07;
                pos.setX(i, pos.getX(i) + n);
                pos.setZ(i, pos.getZ(i) + n);
            }
            pos.needsUpdate = true;
        } else if (surface === 'speckle') {
            // Speckle: add random bumps to the geometry
            for (var i = 0; i < pos.count; i++) {
                var y = pos.getY(i);
                var r = Math.sqrt(pos.getX(i)*pos.getX(i) + pos.getZ(i)*pos.getZ(i));
                // Only add bumps to the outer surface
                if (r > 0.5) {
                    var speck = (Math.random() < 0.12) ? (0.08 + Math.random() * 0.18) : 0;
                    if (speck) {
                        var theta = Math.atan2(pos.getZ(i), pos.getX(i));
                        pos.setX(i, pos.getX(i) + Math.cos(theta) * speck);
                        pos.setZ(i, pos.getZ(i) + Math.sin(theta) * speck);
                    }
                }
            }
            pos.needsUpdate = true;
        } else if (surface === 'image') {
            // Image: convert grayscale of texture to relief bumps
            // (requires the image to be loaded synchronously, so use a simple pattern if not loaded)
            var img = new window.Image();
            img.src = 'images/assets/vase_texture.jpg';
            img.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = 128; canvas.height = 256;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 128, 256);
                var data = ctx.getImageData(0, 0, 128, 256).data;
                for (var i = 0; i < pos.count; i++) {
                    var y = pos.getY(i);
                    var r = Math.sqrt(pos.getX(i)*pos.getX(i) + pos.getZ(i)*pos.getZ(i));
                    var theta = Math.atan2(pos.getZ(i), pos.getX(i));
                    // Map y and theta to image coordinates
                    var ix = Math.floor((theta + Math.PI) / (2 * Math.PI) * 128);
                    var iy = Math.floor((y / 6) * 256);
                    var idx = (iy * 128 + ix) * 4;
                    var lum = (data[idx] + data[idx+1] + data[idx+2]) / 3 / 255;
                    var bump = (lum - 0.5) * 0.25; // strong relief
                    pos.setX(i, pos.getX(i) + Math.cos(theta) * bump);
                    pos.setZ(i, pos.getZ(i) + Math.sin(theta) * bump);
                }
                pos.needsUpdate = true;
            };
            // If image not loaded, fallback to a simple banded relief
            for (var i = 0; i < pos.count; i++) {
                var y = pos.getY(i);
                var r = Math.sqrt(pos.getX(i)*pos.getX(i) + pos.getZ(i)*pos.getZ(i));
                var theta = Math.atan2(pos.getZ(i), pos.getX(i));
                var band = Math.floor((y / 6) * 10) % 2;
                var bump = band ? 0.12 : -0.12;
                pos.setX(i, pos.getX(i) + Math.cos(theta) * bump * 0.5);
                pos.setZ(i, pos.getZ(i) + Math.sin(theta) * bump * 0.5);
            }
            pos.needsUpdate = true;
        }

        var material = new T.MeshPhysicalMaterial(materialOptions);

        var mesh = new T.Mesh(geometry, material);
        scene.add(mesh);

        /* Subtle ground plane */
        var ground = new T.Mesh(
            new T.CircleGeometry(4, 48),
            new T.MeshStandardMaterial({ color: 0x0c0e18, roughness: 1 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        scene.add(ground);

        /* ── Orbit controls (rotate, zoom, pan) ──────────────────────── */
        var spherical = { theta: 0.6, phi: 1.1, radius: 9.5 };
        var panOffset = { x: 0, y: 0 };
        var autoRotateSpeed = 0.003;
        var isUserInteracting = false;
        var interactionTimeout = null;

        var ZOOM_MIN = 4, ZOOM_MAX = 20;
        var PHI_MIN = 0.2, PHI_MAX = Math.PI - 0.2;

        function updateCamera() {
            var sinPhi = Math.sin(spherical.phi);
            camera.position.set(
                cameraTarget.x + panOffset.x + spherical.radius * sinPhi * Math.sin(spherical.theta),
                cameraTarget.y + panOffset.y + spherical.radius * Math.cos(spherical.phi),
                cameraTarget.z + spherical.radius * sinPhi * Math.cos(spherical.theta)
            );
            camera.lookAt(cameraTarget.x + panOffset.x, cameraTarget.y + panOffset.y, cameraTarget.z);
        }
        updateCamera();

        /* Pointer tracking */
        var pointerState = { active: false, button: -1, x: 0, y: 0 };

        renderer.domElement.addEventListener('pointerdown', function (e) {
            pointerState.active = true;
            pointerState.button = e.button;
            pointerState.x = e.clientX;
            pointerState.y = e.clientY;
            isUserInteracting = true;
            clearTimeout(interactionTimeout);
            renderer.domElement.style.cursor = e.button === 2 ? 'move' : 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('pointermove', function (e) {
            if (!pointerState.active) return;
            var dx = e.clientX - pointerState.x;
            var dy = e.clientY - pointerState.y;
            pointerState.x = e.clientX;
            pointerState.y = e.clientY;

            if (pointerState.button === 0) {
                /* Left drag: orbit */
                spherical.theta -= dx * 0.006;
                spherical.phi = Math.max(PHI_MIN, Math.min(PHI_MAX, spherical.phi - dy * 0.006));
            } else if (pointerState.button === 2) {
                /* Right drag: pan */
                panOffset.x -= dx * 0.01;
                panOffset.y += dy * 0.01;
            }
            updateCamera();
        });

        window.addEventListener('pointerup', function () {
            pointerState.active = false;
            renderer.domElement.style.cursor = 'grab';
            /* Resume auto-rotate after 2s of inactivity */
            interactionTimeout = setTimeout(function () { isUserInteracting = false; }, 2000);
        });

        /* Scroll: zoom */
        renderer.domElement.addEventListener('wheel', function (e) {
            e.preventDefault();
            spherical.radius = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, spherical.radius + e.deltaY * 0.01));
            isUserInteracting = true;
            clearTimeout(interactionTimeout);
            interactionTimeout = setTimeout(function () { isUserInteracting = false; }, 2000);
            updateCamera();
        }, { passive: false });

        /* Disable context menu on canvas */
        renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        /* Touch: pinch-to-zoom */
        var lastPinchDist = 0;
        renderer.domElement.addEventListener('touchstart', function (e) {
            if (e.touches.length === 2) {
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });
        renderer.domElement.addEventListener('touchmove', function (e) {
            if (e.touches.length === 2) {
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var delta = lastPinchDist - dist;
                spherical.radius = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, spherical.radius + delta * 0.03));
                lastPinchDist = dist;
                updateCamera();
            }
        }, { passive: true });

        renderer.domElement.style.cursor = 'grab';

        /* Double-click: reset view */
        renderer.domElement.addEventListener('dblclick', function () {
            spherical.theta = 0.6;
            spherical.phi = 1.1;
            spherical.radius = 9.5;
            panOffset.x = 0;
            panOffset.y = 0;
            isUserInteracting = false;
            updateCamera();
        });

        /* Animation loop */
        function animate() {
            _animId = requestAnimationFrame(animate);
            if (!isUserInteracting) {
                spherical.theta += autoRotateSpeed;
                updateCamera();
            }
            renderer.render(scene, camera);
        }
        animate();

        /* Handle resize */
        var onResize = function () {
            var w = container.offsetWidth;
            var h = container.offsetHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        _renderer = renderer;

        return {
            geometry: geometry,
            cleanup: function () {
                cancelAnimationFrame(_animId);
                window.removeEventListener('resize', onResize);
                renderer.dispose();
                geometry.dispose();
                material.dispose();
                ground.geometry.dispose();
                ground.material.dispose();
                container.removeChild(renderer.domElement);
                _renderer = null;
            }
        };
    }

    /* ── Modal ───────────────────────────────────────────────────────── */
    var _sceneRef = null;

    function buildModal() {
        if ($('#vaseModal').length) return;
        var html = [
            '<div id="vaseModal" class="vase-modal-overlay" style="display:none">',
            '  <div class="vase-modal-box">',
            '    <div class="vase-modal-header">',
            '      <div class="vase-modal-title-group">',
            '        <span class="vase-modal-icon">&#x1FAD9;</span>',
            '        <div>',
            '          <h3 class="vase-modal-title">Life Vase</h3>',
            '          <p class="vase-modal-subtitle">Your timeline, shaped into ceramic</p>',
            '        </div>',
            '      </div>',
            '      <button class="vase-modal-close" aria-label="Close">&times;</button>',
            '    </div>',
            '    <div class="vase-modal-canvas" id="vaseCanvas"></div>',
            '    <div class="vase-modal-controls">',
            '      <label for="vaseSurface">Surface:</label>',
            '      <select id="vaseSurface">',
            '        <option value="smooth">Smooth</option>',
            '        <option value="ridges">Wheel Ridges</option>',
            '        <option value="speckle">Speckle</option>',
            '        <option value="hand">Hand-thrown</option>',
            '        <option value="image">Image Texture</option>',
            '      </select>',
            '    </div>',
            '    <div class="vase-modal-footer">',
            '      <p class="vase-modal-hint">Drag to orbit &middot; Scroll to zoom &middot; Right-drag to pan &middot; Double-click to reset</p>',
            '      <button class="vase-modal-export" id="vaseExportSTL">',
            '        <span class="vase-export-icon">&#x2B07;</span> Download STL for 3D printing',
            '      </button>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        $('body').append(html);

        /* Close handlers */
        $('#vaseModal').on('click', function (e) {
            if ($(e.target).is('#vaseModal')) closeVaseModal();
        });
        $(document).on('click', '#vaseModal .vase-modal-close', closeVaseModal);
        $(document).on('keydown.vaseModal', function (e) {
            if (e.key === 'Escape' && $('#vaseModal').is(':visible')) closeVaseModal();
        });

        /* Export */
        $(document).on('click', '#vaseExportSTL', function () {
            if (_sceneRef && _sceneRef.geometry) {
                downloadSTL(_sceneRef.geometry);
            }
        });
    }

    function openVaseModal() {
        buildModal();
        $('#vaseModal').fadeIn(200);
        $('body').addClass('gallery-modal-open');

        var events = scoredEvents(_data);
        if (events.length < 2) {
            $('#vaseCanvas').html('<p style="color:rgba(255,255,255,0.5);text-align:center;padding:60px">Need at least 2 scored events to generate a vase.</p>');
            return;
        }

        /* Show loading state */
        $('#vaseCanvas').html('<p style="color:rgba(255,255,255,0.5);text-align:center;padding:60px">Loading 3D engine...</p>');

        loadThree().then(function () {
            $('#vaseCanvas').empty();
            var surface = $('#vaseSurface').val() || 'smooth';
            _sceneRef = buildScene(document.getElementById('vaseCanvas'), events, surface);
            $('#vaseSurface').off('change').on('change', function () {
                if (_sceneRef) _sceneRef.cleanup();
                $('#vaseCanvas').empty();
                _sceneRef = buildScene(document.getElementById('vaseCanvas'), events, $(this).val());
            });
        }).catch(function (err) {
            $('#vaseCanvas').html('<p style="color:#ef4444;text-align:center;padding:60px">Could not load 3D engine: ' + err.message + '</p>');
        });
    }

    function closeVaseModal() {
        if (_sceneRef) {
            _sceneRef.cleanup();
            _sceneRef = null;
        }
        $('#vaseModal').fadeOut(160);
    }

    /* ── Public API ──────────────────────────────────────────────────── */
    window.VaseView = {
        init: function (data) {
            _data = data || [];
            $(document).on('click', '#vaseEasterEgg', function () {
                openVaseModal();
            });
        },

        open: function () {
            openVaseModal();
        }
    };

})(window, jQuery);
