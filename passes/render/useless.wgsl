@group(0) @binding(0) var<uniform> viewport: vec2<f32>;
@group(0) @binding(1) var<uniform> camera: vec4<f32>;
@group(0) @binding(2) var<uniform> time: f32;
@group(1) @binding(0) var texture: texture_2d<f32>;
@group(1) @binding(1) var texture_sampler: sampler;
@group(1) @binding(2) var<uniform> grid_size: vec2<u32>;

@vertex
fn vs_main(@location(0) pos: vec2<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(pos, 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    //return textureSample(texture, texture_sampler, pos.xy / 2 + vec2<f32>(0.5, 0.5));
    let new_pos = pos.xy / camera.zw + camera.xy;
    if (new_pos.x < 0 || u32(new_pos.x) >= grid_size.x || new_pos.y < 0 || u32(new_pos.y) >= grid_size.y) {
        //return vec4<f32>(0.0, 0.0, 0.0, 1.0);
        //return vec4<f32>(0.2, 0.2, 0.2, 1.0);
        discard;
    }
    return textureSample(texture, texture_sampler, pos.xy / viewport);
}