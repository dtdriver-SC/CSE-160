# Assignment 4 Lighting - Desmond Driver

This version is built from my Assignment 3 world, but cleaned up for the lighting assignment.

## What changed in this version

- Removed most of the old Assignment 3 clutter so the lighting is easier to see.
- Kept a small world/arena with cubes, walls, textures, and camera movement.
- Added a large red sphere directly in front of the starting camera view.
- Changed the second sphere from blue to a smaller red sphere so the scene stays clean while still showing multiple spheres.
- Added Phong lighting with ambient, diffuse, and specular lighting.
- Added a moving point light with X/Y/Z sliders, orbit slider, and RGB sliders.
- Added a visible cube marker at the point light location.
- Added lighting on/off, normal visualization on/off, point light on/off, and spotlight on/off buttons.
- Added a spotlight that follows the camera like a flashlight.
- Kept the required OBJ crystal model, but made it smaller and off to the side so it proves OBJ lighting without distracting from the main red sphere.

## Controls

- W/A/S/D: move
- Q/E: turn
- Mouse drag / mouse look: rotate camera
- L: lighting on/off
- N: normals on/off
- P: point light on/off
- O: spotlight on/off

The small UI is intentionally left in the top-left because the assignment requires visible buttons and sliders for the light controls.


Clean update: the visible demo now uses exactly three colored spheres (red, yellow, and green). The extra OBJ shape is not rendered so the scene stays focused on the lighting requirement.
