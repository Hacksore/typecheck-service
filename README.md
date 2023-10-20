# typecheck-service

This is a cloudflare worker that will take in some typescript code and a testcase. It will use the typescript compiler API on the server to perform typechecking.

We will seed all the typescript lib files into an r2 bucket then at runtime fetch them all, then perform the typecheck and report back the errors.

Demo:
```
// TODO: write demo
```

Not yet implemented: 
- Support for importing custom libraries (very hard)
 
