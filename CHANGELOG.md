# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0]

### Added

- View Welcome pointing to the extension's marketplace
- Event to track text document changes and identify TODOs and add them to the list

### Changed

- Go-to-file function now has a callback to delete an item that no longer exists
- Add Item function now adds the TODO comment according to the filetype

## [1.0.0]

### Added

- Custom tree view for visualizing TODOs list
- Add TODO keybinding
- Delete TODO
- Clear TODOs list
- Go-to-file by a given TODO
- Refresh TODOs list
- Customize add function's keybinding