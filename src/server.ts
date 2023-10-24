import { Context } from 'hono';
import { Hono } from 'hono/quick';
import ts from 'typescript/lib/typescript';
import { z } from 'zod';

type Bindings = {
	TYPEDEFS: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

const TYPESCRIPT_VERSION = '5.2.2';

async function readFromR2(ctx: Context, libName: string): Promise<string> {
	const objectPath = `typescript/v${TYPESCRIPT_VERSION}/${libName}`;
	console.log('Fetting from', objectPath);
	try {
		const object = await ctx.env.TYPEDEFS.get(objectPath);
		console.log('r2', object);
		return 'test';
	} catch (err) {
		console.error(err);
		return 'error';
	}
}

/* IDEA:

Problem we can't read from the filesystem in a worker to get all the standardLibs

Solution:
- use R2 to store the libs extracted from typescript package
- when the function boots up it will fetch them and get the string values for each one

We need to see how fast reading all the d.ts files is, if it's slow we will have to do k/v to speed it up
*/

// NOTE: im not sure which ones we actually need
const standardLibs = [
	'lib.decorators.d.ts',
	'lib.decorators.legacy.d.ts',
	'lib.d.ts',
	'lib.es5.d.ts',
	'lib.webworker.importscripts.d.ts',
	'lib.scripthost.d.ts',
	'lib.dom.d.ts',
	'lib.esnext.d.ts',
];

const standardLibCodeDefs: Record<string, string> = {};
async function typecheck({ code, testCase }: { code: string; testCase: string }) {
	// for now we just concat the code and testCase but it might make more sense to split this into two files?
	const file = ts.createSourceFile('index.ts', `${code}\n${testCase}`, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

	// This is needed
	const compilerHost: ts.CompilerHost = {
		fileExists: (fileName) => fileName === file.fileName,
		getSourceFile: (fileName) => {
			for (const libName of standardLibs) {
				if (libName === fileName) {
					return ts.createSourceFile(libName, standardLibCodeDefs[libName], ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
				}
			}
			// read the dts file from node modules
			if (fileName === file.fileName) return file;
		},
		getDefaultLibFileName: () => 'lib.d.ts',
		writeFile: () => {},
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (f) => f.toLowerCase(),
		getNewLine: () => '\n',
		useCaseSensitiveFileNames: () => false,
		readFile: (fileName) => (fileName === file.fileName ? file.text : undefined),
	};

	const program = ts.createProgram(
		[file.fileName],
		{
			allowJs: true,
			noEmit: true,
			noEmitOnError: true,
			noImplicitAny: true,
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
		},
		compilerHost,
	);

	const allDiagnostics = ts.getPreEmitDiagnostics(program);
	const errors: string[] = [];

	allDiagnostics.forEach((diagnostic) => {
		if (diagnostic.file) {
			const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			const errorMessage = `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
			console.log(errorMessage);
			errors.push(errorMessage);
		} else {
			const errorMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.log(errorMessage);
			errors.push(errorMessage);
		}
	});

	return {
		errors,
	};
}

const codeTestSchema = z.object({
	code: z.string(),
	testCase: z.string(),
});

type CodeTest = z.infer<typeof codeTestSchema>;

app.post('/api/test', async (ctx) => {
	const body = await ctx.req.json<CodeTest>();

	const obj = await ctx.env.TYPEDEFS.get('typescript/v5.2.2/lib.d.ts', {
		
	});

	return ctx.json({ test: 1, obj });

	// let it rip
	try {
		codeTestSchema.parse(body);
	} catch (err) {
		console.error('could not parse the schema');
		return ctx.json({
			error: 'could not parse the schema',
		});
	}

	// read all the standard libs from r2
	for (const lib of standardLibs) {
		standardLibCodeDefs[lib] = await readFromR2(ctx, lib);
	}

	const { code, testCase } = body;
	console.log({ code, testCase });
	const result = typecheck({ code, testCase });

	try {
		return ctx.json({
			result,
		});
	} catch (e) {
		console.log(e);
	}
});

export default app;
