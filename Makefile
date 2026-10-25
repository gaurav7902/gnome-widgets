UUID := gaurav7902@thegorav.xyz
DEST := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: build install nested logs pack

build:
	npm run build

install: pack
	gnome-extensions install --force build/$(UUID).shell-extension.zip

pack: build
	mkdir -p build
	npm run pack

nested: install
	@if gnome-shell --help 2>&1 | grep -q -- '--devkit'; then \
		dbus-run-session gnome-shell --devkit --wayland; \
	else \
		dbus-run-session gnome-shell --nested; \
	fi

logs:
	journalctl -f -o cat /usr/bin/gnome-shell | grep --line-buffered -i -E "lumen-extension|lumen:|$(UUID)"
