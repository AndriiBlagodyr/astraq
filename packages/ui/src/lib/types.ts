/**
 * Base UI parts accept `className` as a string or a state function. Wrappers
 * merge their own classes with `cn()`, so they take a plain string.
 */
export type WithClassName<P> = Omit<P, "className"> & { className?: string };
