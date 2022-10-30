# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] WIP

- Expiring of function objects
- Basic tracking of the memory held by Python objects referenced in JS by the V8 GC
- Do not allow `PYTHONPATH` to override `PYTHONHOME` when using the builtin Python
- (internals) New automatic reference counting

### [1.0.1] 2022-10-29

- Enable TypeScript strict mode
- Fix [#1](https://github.com/mmomtchev/pymport/issues/1), always consume Python exceptions

# [1.0.0] 2022-10-28

- First release
