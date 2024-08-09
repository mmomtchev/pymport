/**
 * This test file is just a .mts file to ensure that pymport
 * can be import in es module typescript file successfulluy without tsc compile error.
 * Not intended to be run with mocha
 */

import { assert } from "chai";
import { pymport, proxify, PyObject } from "pymport";

describe("es-module", () => {
	it("import", () => {
		const np = proxify(pymport("numpy"));
		assert.instanceOf(np, PyObject);
	});
});
