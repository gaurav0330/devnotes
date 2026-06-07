async function test() {
  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        compiler: "gcc-13.2.0",
        code: `#include <iostream>\nint main() {\n  std::cout << "Hello Wandbox!" << std::endl;\n  return 0;\n}`
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
