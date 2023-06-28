// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

#version 450

struct Element {
    vec3 color;
    float radius;
};

layout(set = 0, binding = 0) uniform Camera {
    vec4 projection[4];
    vec4 view[4];
    vec4 projection_view[4];
} camera;

layout(location = 0) in vec2 uv;
layout(location = 1) in vec4 position_clip_space;
layout(location = 2) flat in vec4 element_vec;
layout(location = 4) flat in vec4 center_view_space;
layout(location = 5) in vec4 position_view_space;

layout(depth_greater) out float gl_FragDepth;
layout(location = 0) out vec4 color;
layout(location = 1) out vec4 normal;

float map(float value, float low1, float high1, float low2, float high2) {
    return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

vec4 linear_to_srgb(vec4 input_color) {
    bvec3 cutoff = lessThan(input_color.rgb, vec3(0.0031308));
    vec3 higher = vec3(1.005) * pow(input_color.rgb, vec3(1.0 / 2.4)) - vec3(0.055);
    vec3 lower = input_color.rgb * vec3(12.92);

    return vec4(mix(higher, lower, cutoff), input_color.a);
}

void main(void) {
    Element element;
    element.color = element_vec.xyz;
    element.radius = element_vec.w;
    const float dist = length(uv);
    if (dist > element.radius) {
        discard;
    }

    const float z = sqrt(element.radius * element.radius - dist * dist);
    const vec4 in_pos_clipspace = position_clip_space + camera.projection[2] * z;

    gl_FragDepth = in_pos_clipspace.z / in_pos_clipspace.w;

    color = vec4(
        element.color * map(z, 0.0, element.radius, 0.25, 1.0),
        1.0
    );
    normal = vec4(normalize(position_view_space.xyz - center_view_space.xyz), 0.0);

#ifdef TARGET_WASM
    // Currently, firefox webgpu doesn't automatically convert linear rgb outputs to srgb
    // so we do it manually.
    color = linear_to_srgb(color);
#endif
}

// End of File
