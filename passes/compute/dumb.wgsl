@group(0) @binding(0) var<uniform> tick: u32;
@group(0) @binding(1) var<uniform> grid_size: vec2<u32>;
@group(0) @binding(2) var<storage, read_write> grid: array<f32>;
@group(0) @binding(3) var<storage, read_write> next_grid: array<f32>;
@group(0) @binding(4) var<storage, read_write> chunks: array<u32>;
@group(0) @binding(5) var<storage, read_write> next_chunks: array<u32>;
@group(0) @binding(6) var<storage, read> brush: array<f32>;

const stride = 4;

@compute @workgroup_size(1, 1)
fn compute_main(@builtin(global_invocation_id) pos: vec3<u32>) {
    // if (pos.x >= grid_size.x || pos.y >= grid_size.y) {
    //     return;
    // }
    let buffer = 8;
    let this_index = (pos.x + pos.y * grid_size.x) * stride;
    grid[this_index] = 0;
    grid[this_index + 1] = 0;
    grid[this_index + 2] = 0;
    grid[this_index] += next_grid[this_index] / 3;
    grid[this_index + 1] += next_grid[this_index + 1] / 3;
    grid[this_index + 2] += next_grid[this_index + 2] / 3;
    for (var y = max(i32(pos.y) - buffer, 0); y <= min(i32(pos.y) + buffer, i32(grid_size.y) - 1); y++) {
        for (var x = max(i32(pos.x) - buffer, 0); x <= min(i32(pos.x) + buffer, i32(grid_size.x) - 1); x++) {
            let index = (u32(x) + u32(y) * grid_size.x) * stride;
            let spd_x = next_grid[index];
            let spd_y = next_grid[index + 1];
            let temperature = next_grid[index + 2];
            let x1 = u32(min(max(x + i32(round(spd_x)), 0), i32(grid_size.x - 1)));
            let y1 = u32(min(max(y + i32(round(spd_y)), 0), i32(grid_size.y - 1)));
            // let index1 = (x1 + y1 * grid_size.x) * stride;
            let x2 = u32(min(max(x + i32(round(spd_x / 2)), 0), i32(grid_size.x - 1)));
            let y2 = u32(min(max(y + i32(round(spd_y / 2)), 0), i32(grid_size.y - 1)));
            // let index2 = (x2 + y2 * grid_size.x) * stride;
            if (x1 == pos.x && y1 == pos.y) {
                grid[this_index] += spd_x / 3;
                grid[this_index + 1] += spd_y / 3;
                grid[this_index + 2] += temperature / 3;
            }
            if (x2 == pos.x && y2 == pos.y) {
                grid[this_index] += spd_x / 3;
                grid[this_index + 1] += spd_y / 3;
                grid[this_index + 2] += temperature / 3;
            }
        }
    }
}