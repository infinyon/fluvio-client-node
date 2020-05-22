fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    node_bindgen::build::configure();
}
