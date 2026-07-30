/**
 * The browser core intentionally uses bundler-style extensionless imports.
 * Node's native TypeScript runner does not add `.ts`, so this narrow loader
 * resolves only missing relative specifiers to their TypeScript source file.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[a-z0-9]+$/i.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
