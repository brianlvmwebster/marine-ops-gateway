// @ts-nocheck
// Preserved production editor from lvm-show-layouts main 9c9448d.
export function initializeLayout(document,window,options={}){
const localStorage=window.localStorage,ResizeObserver=window.ResizeObserver,DOMPoint=window.DOMPoint,Image=window.Image;
const requestAnimationFrame=window.requestAnimationFrame.bind(window);
return (function() {

// layout-migration-source/client/surroundings.js
	const SURROUNDING_EDGES = [
		"top",
		"right",
		"bottom",
		"left"
	];
	function validSurroundings(value) {
		if (value === void 0) return true;
		if (!value || typeof value !== "object" || Array.isArray(value)) return false;
		return Object.keys(value).every((edge) => SURROUNDING_EDGES.includes(edge)) && Object.values(value).every((area) => area && typeof area === "object" && !Array.isArray(area) && (area.label === void 0 || typeof area.label === "string" && area.label.length <= 100) && (area.depth === void 0 || Number.isFinite(area.depth) && area.depth >= 12 && area.depth <= 1200) && (area.rotation === void 0 || Number.isFinite(area.rotation) && area.rotation >= 0 && area.rotation <= 360));
	}
	function surroundingSettings(value) {
		return Object.fromEntries(SURROUNDING_EDGES.map((edge) => [edge, {
			label: typeof value?.[edge]?.label === "string" ? value[edge].label.trim().slice(0, 100) : "",
			depth: Number.isFinite(value?.[edge]?.depth) && value[edge].depth >= 12 && value[edge].depth <= 1200 ? value[edge].depth : 72,
			rotation: Number.isFinite(value?.[edge]?.rotation) && value[edge].rotation >= 0 && value[edge].rotation <= 360 ? value[edge].rotation % 360 : edge === "left" || edge === "right" ? 270 : 0
		}]));
	}
	function surroundingAreas(state) {
		const settings = surroundingSettings(state.surroundings), { w, h } = state.booth, gap = 36;
		return SURROUNDING_EDGES.filter((edge) => settings[edge].label).map((edge) => {
			const { label, depth, rotation } = settings[edge];
			return {
				edge,
				label,
				rotation,
				...edge === "top" ? {
					x: 0,
					y: -36 - depth,
					w,
					h: depth
				} : edge === "bottom" ? {
					x: 0,
					y: h + gap,
					w,
					h: depth
				} : edge === "left" ? {
					x: -36 - depth,
					y: 0,
					w: depth,
					h
				} : {
					x: w + gap,
					y: 0,
					w: depth,
					h
				},
				vertical: edge === "left" || edge === "right"
			};
		});
	}
	function surroundingBounds(state) {
		const areas = surroundingAreas(state);
		const x = Math.min(0, ...areas.map((a) => a.x)), y = Math.min(0, ...areas.map((a) => a.y));
		return {
			x,
			y,
			w: Math.max(state.booth.w, ...areas.map((a) => a.x + a.w)) - x,
			h: Math.max(state.booth.h, ...areas.map((a) => a.y + a.h)) - y
		};
	}
	function surroundingLabel(area) {
		const rotation = area.rotation ?? (area.vertical ? 270 : 0), angle = rotation * Math.PI / 180, c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
		const rawWidth = area.w * c + area.h * s, rawHeight = area.w * s + area.h * c;
		const scale = Math.min(area.w / (rawWidth * c + rawHeight * s), area.h / (rawWidth * s + rawHeight * c));
		const length = rawWidth * scale, depth = rawHeight * scale;
		const size = Math.min(16, depth / 3, length / 8), capacity = Math.max(8, Math.floor(length * .85 / (size * .6)));
		const lines = [];
		for (const word of area.label.split(/\s+/)) {
			let rest = word;
			if (lines.length && lines.at(-1).length + 1 + rest.length <= capacity) {
				lines[lines.length - 1] += " " + rest;
				continue;
			}
			while (rest.length > capacity) {
				lines.push(rest.slice(0, capacity));
				rest = rest.slice(capacity);
			}
			if (rest) lines.push(rest);
		}
		return {
			lines,
			size: Math.min(size, depth * .8 / (Math.max(1, lines.length) * 1.3)),
			maxWidth: length * .85,
			rotation
		};
	}

// layout-migration-source/client/dock-materials.js
	function dockCorners(dock) {
		if (dock.kind !== "dock") return [];
		if (dock.shape === "polygon") return Array.isArray(dock.points) ? dock.points : [];
		if (dock.shape !== "rectangle") return [];
		return [
			[-dock.w / 2, -dock.h / 2],
			[dock.w / 2, -dock.h / 2],
			[dock.w / 2, dock.h / 2],
			[-dock.w / 2, dock.h / 2]
		];
	}
	function dockLegs(dock) {
		return dockCorners(dock).map((_, i) => dock.dockLegs?.[i] ?? true);
	}
	function validDockMaterials(dock) {
		return dock.dockLegs === void 0 || dock.kind === "dock" && Array.isArray(dock.dockLegs) && dock.dockLegs.length === dockCorners(dock).length && dock.dockLegs.every((v) => typeof v === "boolean");
	}
	function dockDecking(dock) {
		if (dock.kind !== "dock") return {
			panels: 0,
			triangles: 0,
			unlisted: 0
		};
		if (dock.shape === "polygon" && dock.points.length === 3 && dock.w === 36 && dock.h === 36) return {
			panels: 0,
			triangles: 1,
			unlisted: 0
		};
		const [w, h] = [dock.w, dock.h].sort((a, b) => a - b);
		const panels = (/* @__PURE__ */ new Map([
			[48, 2],
			[102, 4],
			[126, 5],
			[150, 6],
			[198, 8]
		])).get(h);
		if (dock.shape === "rectangle" && (w === 48 && panels !== void 0 || w === 72 && h === 102)) return {
			panels,
			triangles: 0,
			unlisted: 0
		};
		return {
			panels: 0,
			triangles: 0,
			unlisted: 1
		};
	}
	function dockMaterials(items) {
		return items.filter((o) => o.kind === "dock").reduce((total, dock) => {
			const decking = dockDecking(dock);
			total.legs += dockLegs(dock).filter(Boolean).length;
			total.panels += decking.panels;
			total.triangles += decking.triangles;
			total.unlisted += decking.unlisted;
			return total;
		}, {
			legs: 0,
			panels: 0,
			triangles: 0,
			unlisted: 0
		});
	}

// layout-migration-source/client/movement-groups.js
	function movementMembers(items, id) {
		const anchor = items.find((o) => o.id === id);
		return anchor ? anchor.groupId ? items.filter((o) => o.groupId === anchor.groupId) : [anchor] : [];
	}
	const movementLocked = (items, id) => movementMembers(items, id).some((o) => o.locked);
	function translateGroup(items, id, dx, dy) {
		const members = movementMembers(items, id);
		if (!members.length || members.some((o) => o.locked) || ![dx, dy].every(Number.isFinite) || !dx && !dy) return false;
		for (const o of members) {
			o.x += dx;
			o.y += dy;
		}
		return true;
	}
	function cleanupMovementGroups(items) {
		const counts = /* @__PURE__ */ new Map();
		for (const o of items) if (o.groupId) counts.set(o.groupId, (counts.get(o.groupId) || 0) + 1);
		for (const o of items) if (o.groupId && counts.get(o.groupId) < 2) delete o.groupId;
	}
	function linkMovementItems(items, ids, groupId = crypto.randomUUID()) {
		const chosen = new Set(ids), groups = new Set(items.filter((o) => chosen.has(o.id) && o.groupId).map((o) => o.groupId));
		const members = items.filter((o) => chosen.has(o.id) || groups.has(o.groupId));
		if (members.length < 2) return false;
		if (members[0].groupId && members.every((o) => o.groupId === members[0].groupId)) return false;
		for (const o of members) o.groupId = groupId;
		cleanupMovementGroups(items);
		return true;
	}
	function unlinkMovementItem(items, id) {
		const item = items.find((o) => o.id === id);
		if (!item?.groupId) return false;
		delete item.groupId;
		cleanupMovementGroups(items);
		return true;
	}
	function ungroupMovementItems(items, id) {
		const item = items.find((o) => o.id === id);
		if (!item?.groupId) return false;
		const group = item.groupId;
		for (const o of items) if (o.groupId === group) delete o.groupId;
		return true;
	}
	function validMovementGroups(items) {
		const counts = /* @__PURE__ */ new Map();
		for (const o of items) {
			if (!o || typeof o !== "object") return false;
			if (o.groupId !== void 0) {
				if (typeof o.groupId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(o.groupId)) return false;
				counts.set(o.groupId, (counts.get(o.groupId) || 0) + 1);
			}
		}
		return [...counts.values()].every((count) => count >= 2);
	}

// layout-migration-source/client/branding.js
	const THEMES = [
		"marina",
		"blueprint",
		"classic"
	];
	const normalizeTheme = (value) => THEMES.includes(value) ? value : "marina";
	function validVenue(value) {
		return value === void 0 || !!value && typeof value === "object" && !Array.isArray(value) && (value.name === void 0 || typeof value.name === "string" && value.name.length <= 100) && (value.logo === void 0 || value.logo === "" || typeof value.logo === "string" && value.logo.length <= 1e6 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.logo)) && (value.logoFileName === void 0 || typeof value.logoFileName === "string" && value.logoFileName.length <= 150);
	}
	function venueSettings(value) {
		return {
			name: typeof value?.name === "string" ? value.name : "",
			logo: typeof value?.logo === "string" ? value.logo : "",
			logoFileName: typeof value?.logoFileName === "string" ? value.logoFileName : ""
		};
	}
	async function prepareVenueLogo(file) {
		if (!file || ![
			"image/png",
			"image/jpeg",
			"image/webp",
			"image/svg+xml"
		].includes(file.type)) throw Error("Choose a PNG, JPG, WebP, or SVG logo.");
		if (file.size > 5242880) throw Error("Choose a venue logo under 5 MB.");
		const url = URL.createObjectURL(file);
		try {
			const image = new Image();
			image.src = url;
			try {
				await image.decode();
			} catch {
				throw Error("This logo could not be read. Try a PNG, JPG, WebP, or SVG image.");
			}
			if (!image.naturalWidth || !image.naturalHeight) throw Error("The logo needs a visible width and height.");
			const ratio = Math.min(1, 768 / image.naturalWidth, 384 / image.naturalHeight);
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
			canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
			canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
			let logo;
			try {
				logo = canvas.toDataURL("image/png");
			} catch {
				throw Error("This logo cannot be embedded. Try saving it as a PNG first.");
			}
			if (logo.length > 1e6) throw Error("This logo is too complex to embed. Try a smaller image.");
			return {
				logo,
				logoFileName: file.name.slice(0, 150)
			};
		} finally {
			URL.revokeObjectURL(url);
		}
	}

// layout-migration-source/client/evotti-colors.js
	const EVOTTI_COLORWAYS = {
		"evotti-4551": {
			"defaultColorwayId": "ghost-white",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4551-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4551-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4551-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4551-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4549": {
			"defaultColorwayId": "roan-bronze",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4549-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4549-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4549-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4549-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-139": {
			"defaultColorwayId": "spectra-black",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-139-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-139-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-139-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-139-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4554": {
			"defaultColorwayId": "steel-gray",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4554-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4554-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4554-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4554-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4552": {
			"defaultColorwayId": "ghost-white",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4552-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4552-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4552-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4552-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-140": {
			"defaultColorwayId": "roan-bronze",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-140-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-140-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-140-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-140-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4557": {
			"defaultColorwayId": "spectra-black",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4557-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4557-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4557-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4557-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4556": {
			"defaultColorwayId": "steel-gray",
			"variants": [
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4556-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4556-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4556-steel-gray.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4556-spectra-black.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4564": {
			"defaultColorwayId": "ghost-white",
			"variants": [
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4564-spectra-black.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4564-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4564-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4564-steel-gray.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4563": {
			"defaultColorwayId": "roan-bronze",
			"variants": [
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4563-spectra-black.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4563-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4563-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4563-steel-gray.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4565": {
			"defaultColorwayId": "spectra-black",
			"variants": [
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4565-spectra-black.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4565-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4565-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4565-steel-gray.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4561": {
			"defaultColorwayId": "steel-gray",
			"variants": [
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4561-spectra-black.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4561-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4561-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4561-steel-gray.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4566": {
			"defaultColorwayId": "ghost-white",
			"variants": [
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4566-spectra-black.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4566-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4566-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4566-steel-gray.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4559": {
			"defaultColorwayId": "roan-bronze",
			"variants": [
				{
					"id": "spectra-black",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4559-spectra-black.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "ghost-white",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4559-ghost-white.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4559-roan-bronze.webp",
					"width": 1600,
					"height": 484
				},
				{
					"id": "steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/layout-evotti-colors-evotti-4559-steel-gray.webp",
					"width": 1600,
					"height": 484
				}
			]
		},
		"evotti-4558": {
  "defaultColorwayId": "steel-gray-steel-gray",
  "variants": [
    {
      "id": "ghost-white-steel-gray",
      "name": "Ghost White / Steel Gray Evolution",
      "upholstery": "Ghost White",
      "flooring": "Steel Gray Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145347.png",
        "/_cdn/static/evotti-721ql-layer-145348.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "ghost-white-roan-bronze",
      "name": "Ghost White / Roan Bronze Evolution",
      "upholstery": "Ghost White",
      "flooring": "Roan Bronze Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145346.png",
        "/_cdn/static/evotti-721ql-layer-145348.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "roan-bronze-steel-gray",
      "name": "Roan Bronze / Steel Gray Evolution",
      "upholstery": "Roan Bronze",
      "flooring": "Steel Gray Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145347.png",
        "/_cdn/static/evotti-721ql-layer-145349.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "roan-bronze-roan-bronze",
      "name": "Roan Bronze / Roan Bronze Evolution",
      "upholstery": "Roan Bronze",
      "flooring": "Roan Bronze Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145346.png",
        "/_cdn/static/evotti-721ql-layer-145349.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "steel-gray-steel-gray",
      "name": "Steel Gray / Steel Gray Evolution",
      "upholstery": "Steel Gray",
      "flooring": "Steel Gray Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145347.png",
        "/_cdn/static/evotti-721ql-layer-145351.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "steel-gray-roan-bronze",
      "name": "Steel Gray / Roan Bronze Evolution",
      "upholstery": "Steel Gray",
      "flooring": "Roan Bronze Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145346.png",
        "/_cdn/static/evotti-721ql-layer-145351.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "spectra-black-steel-gray",
      "name": "Spectra Black / Steel Gray Evolution",
      "upholstery": "Spectra Black",
      "flooring": "Steel Gray Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145347.png",
        "/_cdn/static/evotti-721ql-layer-145350.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    },
    {
      "id": "spectra-black-roan-bronze",
      "name": "Spectra Black / Roan Bronze Evolution",
      "upholstery": "Spectra Black",
      "flooring": "Roan Bronze Evolution",
      "path": "/_cdn/static/evotti-725ql-layer-145345.png",
      "layers": [
        "/_cdn/static/evotti-725ql-layer-145345.png",
        "/_cdn/static/evotti-721ql-layer-145346.png",
        "/_cdn/static/evotti-721ql-layer-145350.png"
      ],
      "width": 4800,
      "height": 1451,
      "imageBounds": [
        293,
        119,
        3939,
        1214
      ],
      "sharedArtwork": true
    }
  ]
},
		"evotti-4562": {
			"defaultColorwayId": "steel-gray-steel-gray",
			"variants": [
				{
					"id": "ghost-white-steel-gray",
					"name": "Ghost White / Steel Gray Evolution",
					"upholstery": "Ghost White",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145347.png",
						"/_cdn/static/evotti-721ql-layer-145348.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "ghost-white-roan-bronze",
					"name": "Ghost White / Roan Bronze Evolution",
					"upholstery": "Ghost White",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145346.png",
						"/_cdn/static/evotti-721ql-layer-145348.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "roan-bronze-steel-gray",
					"name": "Roan Bronze / Steel Gray Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145347.png",
						"/_cdn/static/evotti-721ql-layer-145349.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "roan-bronze-roan-bronze",
					"name": "Roan Bronze / Roan Bronze Evolution",
					"upholstery": "Roan Bronze",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145346.png",
						"/_cdn/static/evotti-721ql-layer-145349.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "steel-gray-steel-gray",
					"name": "Steel Gray / Steel Gray Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145347.png",
						"/_cdn/static/evotti-721ql-layer-145351.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "steel-gray-roan-bronze",
					"name": "Steel Gray / Roan Bronze Evolution",
					"upholstery": "Steel Gray",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145346.png",
						"/_cdn/static/evotti-721ql-layer-145351.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "spectra-black-steel-gray",
					"name": "Spectra Black / Steel Gray Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Steel Gray Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145347.png",
						"/_cdn/static/evotti-721ql-layer-145350.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				},
				{
					"id": "spectra-black-roan-bronze",
					"name": "Spectra Black / Roan Bronze Evolution",
					"upholstery": "Spectra Black",
					"flooring": "Roan Bronze Evolution",
					"path": "/_cdn/static/evotti-721ql-layer-145341.png",
					"layers": [
						"/_cdn/static/evotti-721ql-layer-145341.png",
						"/_cdn/static/evotti-721ql-layer-145346.png",
						"/_cdn/static/evotti-721ql-layer-145350.png"
					],
					"width": 4800,
					"height": 1451,
					"imageBounds": [
						293,
						119,
						3939,
						1214
					],
					"sharedArtwork": true
				}
			]
		}
	};
	const evottiColorways = (id) => EVOTTI_COLORWAYS[id]?.variants || [];
	function evottiColorway(modelId, id) {
		if (id === "original") return null;
		const palette = EVOTTI_COLORWAYS[modelId];
		return palette?.variants.find((v) => v.id === (id || palette.defaultColorwayId)) || null;
	}

// layout-migration-source/client/premier-catalog.js
	const PREMIER_MODELS = [
		{
			"id": "premier-180-sunscape-re-cl",
			"name": "180 SUNSCAPE RE - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 18,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches.",
			"lengthIn": 234,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-3ed3e73399b21c19.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "19' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1190,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1190,
				508
			],
			"imageContours": [[
				[0, 57],
				[6, 44],
				[10, 40],
				[24, 38],
				[33, 23],
				[42, 14],
				[57, 5],
				[73, 0],
				[1093, 1],
				[1103, 32],
				[1110, 32],
				[1113, 30],
				[1129, 30],
				[1131, 32],
				[1132, 161],
				[1189, 163],
				[1190, 346],
				[1130, 348],
				[1107, 343],
				[1106, 459],
				[1100, 491],
				[1094, 507],
				[74, 508],
				[58, 503],
				[43, 494],
				[33, 484],
				[23, 466],
				[11, 464],
				[4, 456],
				[1, 448]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-180-sunscape-rf-cl",
			"name": "180 SUNSCAPE RF - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 18,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 234,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9a9d786cbda5e6ff.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "19' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1187,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1187,
				507
			],
			"imageContours": [[
				[0, 56],
				[6, 44],
				[10, 40],
				[24, 38],
				[32, 24],
				[42, 14],
				[57, 5],
				[73, 0],
				[1090, 1],
				[1100, 31],
				[1126, 30],
				[1128, 32],
				[1129, 161],
				[1186, 162],
				[1187, 346],
				[1125, 347],
				[1104, 342],
				[1103, 460],
				[1098, 487],
				[1091, 506],
				[73, 507],
				[60, 503],
				[44, 494],
				[30, 479],
				[23, 465],
				[11, 463],
				[4, 455],
				[1, 447]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-180-sunscape-re-xsd-cl",
			"name": "180 SUNSCAPE RE XSD - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 18,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches.",
			"lengthIn": 234,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-502a4236d5e02e5e.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "19' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1187,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1187,
				507
			],
			"imageContours": [[
				[0, 56],
				[6, 44],
				[10, 40],
				[24, 38],
				[32, 24],
				[42, 14],
				[57, 5],
				[73, 0],
				[1090, 1],
				[1100, 31],
				[1126, 30],
				[1128, 32],
				[1129, 161],
				[1186, 162],
				[1187, 346],
				[1125, 347],
				[1104, 342],
				[1103, 460],
				[1098, 487],
				[1091, 506],
				[73, 507],
				[60, 503],
				[44, 494],
				[30, 479],
				[23, 465],
				[11, 463],
				[4, 455],
				[1, 447]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-180-sunscape-rl-cl",
			"name": "180 SUNSCAPE RL - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 18,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 234,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-90c7bae4eb3114d9.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "19' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1186,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1186,
				507
			],
			"imageContours": [[
				[0, 56],
				[6, 44],
				[10, 40],
				[24, 38],
				[29, 28],
				[42, 14],
				[57, 5],
				[72, 0],
				[1089, 1],
				[1099, 31],
				[1125, 30],
				[1127, 32],
				[1128, 161],
				[1185, 162],
				[1186, 346],
				[1124, 347],
				[1104, 342],
				[1102, 461],
				[1099, 479],
				[1091, 506],
				[73, 507],
				[60, 503],
				[44, 494],
				[30, 479],
				[23, 465],
				[11, 463],
				[4, 455],
				[1, 447]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-re-cl",
			"name": "200 SUNSCAPE RE - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-22879f9105f15620.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1304,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1304,
				507
			],
			"imageContours": [[
				[0, 58],
				[5, 46],
				[10, 41],
				[24, 39],
				[32, 25],
				[44, 13],
				[64, 3],
				[79, 0],
				[88, 0],
				[90, 2],
				[1179, 2],
				[1181, 0],
				[1189, 0],
				[1195, 2],
				[1208, 2],
				[1217, 32],
				[1225, 32],
				[1228, 30],
				[1242, 30],
				[1245, 32],
				[1246, 161],
				[1303, 163],
				[1304, 345],
				[1243, 347],
				[1222, 342],
				[1221, 444],
				[1218, 474],
				[1209, 505],
				[1197, 505],
				[1191, 507],
				[1182, 507],
				[1180, 505],
				[91, 505],
				[89, 507],
				[80, 507],
				[71, 506],
				[59, 502],
				[45, 494],
				[32, 481],
				[22, 464],
				[11, 463],
				[8, 460],
				[3, 452],
				[1, 445]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-re-es-cl",
			"name": "200 SUNSCAPE RE ES - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches. ES offers expanded bow seating and adds a port-side bow lounge back.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-24cdb0aae93c49be.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1304,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1304,
				507
			],
			"imageContours": [[
				[0, 60],
				[2, 52],
				[6, 45],
				[10, 41],
				[24, 39],
				[33, 24],
				[43, 14],
				[56, 6],
				[67, 2],
				[85, 0],
				[88, 0],
				[90, 2],
				[1179, 2],
				[1181, 0],
				[1188, 0],
				[1195, 2],
				[1208, 2],
				[1217, 32],
				[1225, 32],
				[1228, 30],
				[1242, 30],
				[1245, 33],
				[1246, 161],
				[1303, 163],
				[1304, 345],
				[1243, 347],
				[1221, 342],
				[1220, 459],
				[1218, 473],
				[1209, 505],
				[1196, 505],
				[1189, 507],
				[1182, 507],
				[1180, 505],
				[91, 505],
				[89, 507],
				[82, 507],
				[72, 506],
				[57, 501],
				[44, 493],
				[33, 482],
				[23, 464],
				[12, 463],
				[6, 457],
				[2, 449],
				[1, 443]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-re-xsd-cl",
			"name": "200 SUNSCAPE RE XSD - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-855393ba876bc6a1.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1308,
			"height": 509,
			"imageBounds": [
				0,
				0,
				1308,
				509
			],
			"imageContours": [[
				[0, 56],
				[4, 47],
				[9, 41],
				[23, 39],
				[33, 23],
				[45, 12],
				[66, 2],
				[77, 0],
				[88, 0],
				[90, 2],
				[1183, 2],
				[1185, 0],
				[1194, 0],
				[1200, 2],
				[1212, 2],
				[1221, 32],
				[1230, 32],
				[1233, 30],
				[1247, 30],
				[1250, 34],
				[1251, 162],
				[1307, 163],
				[1308, 347],
				[1246, 348],
				[1226, 343],
				[1225, 452],
				[1222, 477],
				[1213, 507],
				[1200, 507],
				[1194, 509],
				[1186, 509],
				[1184, 507],
				[91, 507],
				[89, 509],
				[80, 509],
				[71, 508],
				[57, 503],
				[41, 493],
				[31, 482],
				[23, 466],
				[10, 464],
				[3, 455],
				[1, 449]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-re-es-xsd-cl",
			"name": "200 SUNSCAPE RE ES XSD - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches. ES offers expanded bow seating and adds a port-side bow lounge back.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-727fd4b3c28a8be0.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1301,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1301,
				505
			],
			"imageContours": [[
				[0, 56],
				[5, 45],
				[10, 40],
				[24, 38],
				[32, 24],
				[43, 13],
				[57, 5],
				[72, 0],
				[1205, 1],
				[1214, 31],
				[1241, 30],
				[1243, 33],
				[1244, 160],
				[1300, 162],
				[1301, 344],
				[1237, 345],
				[1219, 341],
				[1218, 452],
				[1214, 479],
				[1206, 504],
				[73, 505],
				[60, 501],
				[44, 492],
				[32, 480],
				[23, 463],
				[13, 462],
				[8, 459],
				[1, 445]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-rf-cl",
			"name": "200 SUNSCAPE RF - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-4fdacc444f5ad2de.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1300,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1300,
				505
			],
			"imageContours": [[
				[0, 56],
				[5, 45],
				[10, 40],
				[24, 38],
				[29, 28],
				[42, 14],
				[57, 5],
				[73, 0],
				[1204, 1],
				[1214, 31],
				[1239, 30],
				[1242, 33],
				[1243, 161],
				[1299, 162],
				[1300, 344],
				[1236, 345],
				[1218, 341],
				[1217, 453],
				[1214, 475],
				[1205, 504],
				[74, 505],
				[58, 500],
				[44, 492],
				[30, 477],
				[23, 463],
				[11, 461],
				[4, 453],
				[1, 445]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-rf-es-cl",
			"name": "200 SUNSCAPE RF ES - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Features both rear and bow facing couches on the starboard and port sides. ES offers expanded bow seating and adds a port-side bow lounge back.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-f459aaff3a428c0a.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1308,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1308,
				507
			],
			"imageContours": [[
				[0, 61],
				[2, 52],
				[10, 40],
				[24, 38],
				[35, 21],
				[45, 12],
				[60, 4],
				[72, 0],
				[1211, 1],
				[1221, 31],
				[1247, 30],
				[1249, 33],
				[1250, 161],
				[1307, 163],
				[1308, 345],
				[1246, 347],
				[1225, 342],
				[1224, 455],
				[1221, 477],
				[1212, 506],
				[73, 507],
				[58, 502],
				[42, 492],
				[30, 478],
				[24, 465],
				[11, 463],
				[7, 459],
				[3, 452],
				[1, 442]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-rf-es-dl",
			"name": "200 SUNSCAPE RF ES - DL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs. ES offers expanded bow seating and adds a port-side bow lounge back.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-43656cfee7b7f72b.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1302,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1302,
				505
			],
			"imageContours": [[
				[0, 55],
				[7, 42],
				[9, 40],
				[23, 38],
				[30, 26],
				[40, 15],
				[56, 5],
				[71, 0],
				[1206, 1],
				[1216, 31],
				[1242, 30],
				[1244, 33],
				[1245, 160],
				[1301, 162],
				[1302, 344],
				[1242, 346],
				[1220, 341],
				[1219, 454],
				[1215, 480],
				[1207, 504],
				[72, 505],
				[59, 501],
				[41, 490],
				[29, 476],
				[23, 463],
				[11, 462],
				[4, 454],
				[1, 446]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-rl-cl",
			"name": "200 SUNSCAPE RL - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9f588d5f69a30b79.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1301,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1301,
				505
			],
			"imageContours": [[
				[0, 56],
				[5, 45],
				[10, 40],
				[23, 38],
				[35, 20],
				[44, 12],
				[59, 4],
				[72, 0],
				[1205, 1],
				[1214, 31],
				[1241, 30],
				[1243, 33],
				[1244, 160],
				[1300, 162],
				[1301, 344],
				[1237, 345],
				[1219, 341],
				[1218, 450],
				[1213, 483],
				[1206, 504],
				[73, 505],
				[58, 500],
				[44, 492],
				[32, 480],
				[23, 463],
				[11, 461],
				[4, 453],
				[1, 445]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-rl-es-cl",
			"name": "200 SUNSCAPE RL ES - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches. ES offers expanded bow seating and adds a port-side bow lounge back.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-e35d19aa217c56b2.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1310,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1310,
				508
			],
			"imageContours": [[
				[0, 57],
				[6, 44],
				[10, 40],
				[24, 38],
				[30, 27],
				[41, 15],
				[60, 4],
				[73, 0],
				[1213, 1],
				[1223, 32],
				[1231, 32],
				[1233, 30],
				[1249, 30],
				[1251, 32],
				[1252, 161],
				[1309, 163],
				[1310, 346],
				[1250, 348],
				[1227, 343],
				[1226, 460],
				[1222, 484],
				[1214, 507],
				[74, 508],
				[58, 503],
				[43, 494],
				[31, 481],
				[24, 467],
				[20, 465],
				[11, 464],
				[4, 456],
				[1, 448]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-200-sunscape-rl-es-dl",
			"name": "200 SUNSCAPE RL ES - DL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 20,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs. ES offers expanded bow seating and adds a port-side bow lounge back.",
			"lengthIn": 258,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-f5adc5046a354397.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "21' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1304,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1304,
				507
			],
			"imageContours": [[
				[0, 57],
				[7, 43],
				[12, 40],
				[23, 39],
				[34, 22],
				[45, 12],
				[58, 5],
				[76, 0],
				[88, 0],
				[89, 2],
				[1179, 2],
				[1181, 0],
				[1191, 0],
				[1196, 2],
				[1208, 2],
				[1217, 32],
				[1225, 32],
				[1228, 30],
				[1243, 30],
				[1245, 32],
				[1247, 161],
				[1303, 162],
				[1304, 345],
				[1243, 347],
				[1222, 342],
				[1221, 451],
				[1217, 480],
				[1208, 506],
				[77, 507],
				[59, 502],
				[42, 492],
				[31, 480],
				[23, 465],
				[11, 463],
				[6, 458],
				[1, 447]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-re-cl",
			"name": "220 SUNSCAPE RE - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-de2aa75229da2898.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1427,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1427,
				506
			],
			"imageContours": [[
				[0, 58],
				[2, 51],
				[7, 43],
				[11, 40],
				[24, 38],
				[34, 22],
				[45, 12],
				[60, 4],
				[74, 0],
				[1330, 1],
				[1340, 32],
				[1348, 32],
				[1351, 30],
				[1366, 30],
				[1368, 32],
				[1369, 161],
				[1426, 162],
				[1427, 344],
				[1366, 346],
				[1344, 341],
				[1343, 458],
				[1337, 489],
				[1331, 505],
				[76, 506],
				[59, 501],
				[41, 490],
				[32, 480],
				[23, 464],
				[11, 462],
				[7, 458],
				[1, 444]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-re-es-cl",
			"name": "220 SUNSCAPE RE ES - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches. ES adds a lounge back to the aft couch.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-2795f2c03d63bb9d.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1427,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1427,
				507
			],
			"imageContours": [[
				[0, 58],
				[4, 47],
				[10, 40],
				[24, 38],
				[33, 23],
				[42, 14],
				[59, 4],
				[71, 0],
				[1317, 0],
				[1331, 2],
				[1340, 31],
				[1366, 30],
				[1368, 32],
				[1369, 161],
				[1426, 162],
				[1427, 345],
				[1365, 347],
				[1344, 342],
				[1342, 467],
				[1337, 490],
				[1332, 505],
				[1317, 507],
				[73, 507],
				[58, 502],
				[42, 492],
				[32, 481],
				[23, 465],
				[11, 463],
				[7, 459],
				[1, 445]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-re-xsd-cl",
			"name": "220 SUNSCAPE RE XSD - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-a9945d982b2f83f3.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1423,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1423,
				506
			],
			"imageContours": [[
				[0, 57],
				[6, 44],
				[10, 40],
				[24, 38],
				[33, 23],
				[42, 14],
				[59, 4],
				[72, 0],
				[1327, 1],
				[1336, 31],
				[1362, 30],
				[1364, 32],
				[1365, 161],
				[1422, 162],
				[1423, 345],
				[1360, 346],
				[1341, 342],
				[1339, 461],
				[1334, 487],
				[1328, 505],
				[73, 506],
				[58, 501],
				[43, 492],
				[31, 479],
				[23, 464],
				[11, 462],
				[6, 457],
				[1, 445]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-re-es-xsd-cl",
			"name": "220 SUNSCAPE RE ES XSD - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches. ES adds a lounge back to the aft couch.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-c2d7c0a7bd716360.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1423,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1423,
				507
			],
			"imageContours": [[
				[0, 57],
				[6, 44],
				[11, 40],
				[23, 39],
				[30, 27],
				[41, 15],
				[55, 6],
				[74, 0],
				[88, 0],
				[89, 2],
				[1298, 2],
				[1300, 0],
				[1311, 0],
				[1316, 2],
				[1327, 2],
				[1336, 32],
				[1344, 32],
				[1347, 30],
				[1362, 30],
				[1365, 34],
				[1366, 161],
				[1422, 162],
				[1423, 345],
				[1363, 347],
				[1341, 342],
				[1340, 452],
				[1338, 470],
				[1332, 495],
				[1328, 505],
				[1316, 505],
				[1311, 507],
				[1301, 507],
				[1299, 505],
				[90, 505],
				[89, 507],
				[76, 507],
				[56, 501],
				[42, 492],
				[31, 480],
				[23, 465],
				[11, 463],
				[5, 456],
				[1, 447]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-rf-cl",
			"name": "220 SUNSCAPE RF - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-834edfd461c0e9cc.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1423,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1423,
				506
			],
			"imageContours": [[
				[0, 62],
				[2, 52],
				[9, 41],
				[24, 38],
				[32, 25],
				[44, 13],
				[60, 4],
				[73, 0],
				[1312, 0],
				[1327, 2],
				[1336, 31],
				[1362, 30],
				[1364, 32],
				[1365, 161],
				[1400, 161],
				[1422, 163],
				[1423, 344],
				[1360, 346],
				[1340, 341],
				[1338, 466],
				[1333, 489],
				[1328, 504],
				[1313, 506],
				[74, 506],
				[61, 502],
				[49, 496],
				[41, 490],
				[30, 477],
				[24, 464],
				[11, 462],
				[8, 459],
				[2, 448],
				[1, 441]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-rf-es-cl",
			"name": "220 SUNSCAPE RF ES - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Features both rear and bow facing couches on the starboard and port sides. ES adds lounge backs to the aft couches.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-d163658ebd097b46.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1423,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1423,
				506
			],
			"imageContours": [[
				[0, 59],
				[4, 47],
				[10, 40],
				[24, 38],
				[31, 26],
				[41, 15],
				[55, 6],
				[73, 0],
				[1326, 1],
				[1336, 31],
				[1362, 30],
				[1364, 32],
				[1365, 161],
				[1422, 162],
				[1423, 345],
				[1360, 346],
				[1340, 341],
				[1338, 467],
				[1333, 490],
				[1328, 504],
				[1313, 506],
				[74, 506],
				[56, 500],
				[42, 491],
				[32, 480],
				[23, 464],
				[11, 462],
				[7, 458],
				[1, 444]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-rf-dl",
			"name": "220 SUNSCAPE RF - DL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-b5834c10fdac4fad.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1423,
			"height": 507,
			"imageBounds": [
				0,
				0,
				1423,
				507
			],
			"imageContours": [[
				[0, 56],
				[4, 47],
				[9, 41],
				[23, 39],
				[33, 23],
				[45, 12],
				[55, 6],
				[75, 0],
				[88, 0],
				[89, 2],
				[1298, 2],
				[1300, 0],
				[1311, 0],
				[1315, 2],
				[1327, 2],
				[1337, 32],
				[1344, 32],
				[1347, 30],
				[1362, 30],
				[1365, 34],
				[1366, 161],
				[1422, 162],
				[1423, 345],
				[1363, 347],
				[1341, 342],
				[1340, 453],
				[1337, 476],
				[1328, 505],
				[1316, 505],
				[1312, 507],
				[1301, 507],
				[1299, 505],
				[90, 505],
				[89, 507],
				[76, 507],
				[56, 501],
				[42, 492],
				[31, 480],
				[23, 465],
				[11, 463],
				[4, 455],
				[1, 447]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-rf-es-dl",
			"name": "220 SUNSCAPE RF ES - DL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs. ES adds lounge backs to the aft couches.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-06d0076b4128b7d2.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1425,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1425,
				508
			],
			"imageContours": [[
				[0, 58],
				[5, 46],
				[10, 41],
				[24, 39],
				[32, 25],
				[43, 14],
				[56, 6],
				[67, 2],
				[84, 0],
				[88, 0],
				[90, 2],
				[1300, 2],
				[1302, 0],
				[1309, 0],
				[1316, 2],
				[1329, 2],
				[1338, 32],
				[1346, 32],
				[1350, 30],
				[1363, 30],
				[1366, 33],
				[1367, 162],
				[1424, 163],
				[1425, 346],
				[1361, 347],
				[1342, 343],
				[1340, 469],
				[1337, 484],
				[1330, 506],
				[1317, 506],
				[1310, 508],
				[1303, 508],
				[1301, 506],
				[91, 506],
				[89, 508],
				[81, 508],
				[68, 506],
				[57, 502],
				[44, 494],
				[33, 483],
				[23, 465],
				[13, 464],
				[6, 458],
				[1, 446]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-rl-cl",
			"name": "220 SUNSCAPE RL - CL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-63ec1a21e48a2945.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1429,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1429,
				506
			],
			"imageContours": [[
				[0, 63],
				[2, 52],
				[9, 41],
				[24, 38],
				[32, 25],
				[44, 13],
				[60, 4],
				[73, 0],
				[1332, 1],
				[1341, 31],
				[1368, 30],
				[1370, 33],
				[1371, 161],
				[1427, 162],
				[1428, 174],
				[1429, 332],
				[1428, 345],
				[1367, 346],
				[1346, 341],
				[1345, 450],
				[1341, 479],
				[1333, 505],
				[74, 506],
				[61, 502],
				[49, 496],
				[41, 490],
				[30, 477],
				[24, 464],
				[11, 462],
				[8, 459],
				[3, 450],
				[1, 440]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-220-sunscape-rl-dl",
			"name": "220 SUNSCAPE RL - DL",
			"family": "Sunscape",
			"familyKey": "sunscape",
			"nominalLengthFt": 22,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 282,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-8f85e74cd81dbda0.webp",
			"sourcePage": "https://www.pontoons.com/models/sunscape/",
			"sourceDimensions": {
				"length": "23' 6\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1429,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1429,
				508
			],
			"imageContours": [[
				[0, 56],
				[5, 45],
				[10, 40],
				[24, 38],
				[33, 23],
				[42, 14],
				[59, 4],
				[72, 0],
				[1332, 1],
				[1342, 31],
				[1368, 30],
				[1370, 32],
				[1371, 161],
				[1428, 163],
				[1429, 346],
				[1368, 348],
				[1346, 343],
				[1344, 468],
				[1339, 491],
				[1334, 506],
				[1319, 508],
				[73, 508],
				[60, 504],
				[44, 495],
				[30, 480],
				[23, 466],
				[11, 464],
				[4, 456],
				[1, 448]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-210-sunsation-re-cl",
			"name": "210 SUNSATION RE - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 21,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches.",
			"lengthIn": 273,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-5c31570aa680d19f.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "22' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 584,
			"imageBounds": [
				0,
				0,
				1564,
				584
			],
			"imageContours": [[
				[0, 239],
				[5, 154],
				[13, 70],
				[16, 52],
				[25, 33],
				[38, 18],
				[57, 6],
				[78, 0],
				[1487, 1],
				[1496, 26],
				[1508, 26],
				[1511, 24],
				[1528, 24],
				[1531, 27],
				[1532, 186],
				[1563, 187],
				[1564, 397],
				[1503, 398],
				[1502, 525],
				[1498, 552],
				[1488, 582],
				[1471, 582],
				[1469, 584],
				[1457, 584],
				[1456, 582],
				[96, 581],
				[94, 584],
				[82, 584],
				[58, 577],
				[44, 569],
				[30, 556],
				[20, 539],
				[15, 522],
				[9, 462],
				[1, 344]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-210-sunsation-re-xsd-cl",
			"name": "210 SUNSATION RE XSD - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 21,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches.",
			"lengthIn": 273,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-a559696494903db1.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "22' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 6664,
			"height": 2482,
			"imageBounds": [
				0,
				0,
				6664,
				2482
			],
			"imageContours": [[
				[0, 1223],
				[2, 1066],
				[9, 876],
				[19, 730],
				[39, 498],
				[57, 342],
				[60, 279],
				[71, 223],
				[92, 173],
				[114, 135],
				[131, 113],
				[164, 80],
				[184, 63],
				[212, 45],
				[248, 27],
				[302, 8],
				[330, 2],
				[352, 0],
				[397, 0],
				[399, 2],
				[400, 7],
				[6203, 7],
				[6204, 2],
				[6207, 0],
				[6252, 0],
				[6265, 2],
				[6278, 7],
				[6339, 7],
				[6341, 9],
				[6355, 49],
				[6374, 111],
				[6430, 111],
				[6441, 104],
				[6513, 104],
				[6522, 112],
				[6526, 119],
				[6527, 793],
				[6661, 796],
				[6663, 798],
				[6664, 1687],
				[6663, 1689],
				[6650, 1690],
				[6400, 1695],
				[6398, 2224],
				[6386, 2320],
				[6375, 2369],
				[6361, 2419],
				[6342, 2473],
				[6340, 2475],
				[6276, 2475],
				[6262, 2480],
				[6252, 2480],
				[6247, 2482],
				[6208, 2482],
				[6205, 2480],
				[6204, 2475],
				[401, 2475],
				[400, 2480],
				[398, 2482],
				[359, 2482],
				[354, 2480],
				[332, 2479],
				[303, 2473],
				[249, 2455],
				[214, 2438],
				[181, 2416],
				[164, 2403],
				[139, 2379],
				[119, 2354],
				[103, 2329],
				[87, 2299],
				[75, 2265],
				[65, 2229],
				[61, 2203],
				[58, 2140],
				[40, 1984],
				[23, 1794],
				[10, 1606],
				[3, 1416],
				[1, 1259]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-210-sunsation-rf-cl",
			"name": "210 SUNSATION RF - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 21,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 273,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-91f6df1cb02b046c.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "22' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 584,
			"imageBounds": [
				0,
				0,
				1564,
				584
			],
			"imageContours": [[
				[0, 242],
				[4, 164],
				[15, 57],
				[24, 35],
				[40, 17],
				[55, 7],
				[78, 0],
				[93, 0],
				[95, 2],
				[1454, 2],
				[1457, 0],
				[1487, 2],
				[1496, 26],
				[1508, 26],
				[1511, 24],
				[1528, 24],
				[1531, 28],
				[1532, 185],
				[1563, 187],
				[1564, 397],
				[1503, 398],
				[1502, 521],
				[1499, 544],
				[1496, 558],
				[1488, 581],
				[1475, 581],
				[1470, 584],
				[1458, 584],
				[1456, 581],
				[95, 581],
				[94, 584],
				[83, 584],
				[56, 576],
				[45, 569],
				[30, 555],
				[20, 538],
				[15, 521],
				[6, 430],
				[1, 341]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-210-sunsation-rl-cl",
			"name": "210 SUNSATION RL - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 21,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 273,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-fe5ce1a8752ac69d.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "22' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 584,
			"imageBounds": [
				0,
				0,
				1564,
				584
			],
			"imageContours": [[
				[0, 246],
				[5, 157],
				[15, 58],
				[20, 43],
				[26, 32],
				[42, 15],
				[60, 5],
				[73, 1],
				[82, 0],
				[1487, 1],
				[1499, 40],
				[1508, 40],
				[1510, 38],
				[1528, 38],
				[1531, 41],
				[1532, 186],
				[1563, 187],
				[1564, 397],
				[1503, 398],
				[1502, 517],
				[1499, 545],
				[1494, 565],
				[1488, 581],
				[1474, 581],
				[1468, 584],
				[1457, 584],
				[1455, 581],
				[96, 581],
				[94, 584],
				[83, 584],
				[56, 576],
				[38, 564],
				[25, 548],
				[17, 529],
				[15, 520],
				[6, 426],
				[1, 337]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-re-cl",
			"name": "230 SUNSATION RE - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-0f644e4a96a4e923.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 536,
			"imageBounds": [
				0,
				0,
				1564,
				536
			],
			"imageContours": [[
				[0, 233],
				[4, 151],
				[12, 66],
				[15, 49],
				[25, 28],
				[34, 18],
				[46, 9],
				[70, 0],
				[1463, 2],
				[1465, 0],
				[1492, 1],
				[1494, 3],
				[1501, 24],
				[1513, 24],
				[1515, 22],
				[1530, 22],
				[1533, 25],
				[1534, 171],
				[1563, 172],
				[1564, 365],
				[1508, 366],
				[1507, 479],
				[1505, 497],
				[1495, 533],
				[1482, 534],
				[1478, 536],
				[1466, 536],
				[1464, 534],
				[88, 534],
				[87, 536],
				[72, 536],
				[53, 530],
				[41, 523],
				[26, 508],
				[19, 495],
				[15, 483],
				[5, 385],
				[1, 303]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-re-dl",
			"name": "230 SUNSATION RE - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Features rear entry with an L-shaped rear couch, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-bdb5c14f2c56eb7f.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 537,
			"imageBounds": [
				0,
				0,
				1596,
				537
			],
			"imageContours": [[
				[0, 206],
				[11, 64],
				[15, 45],
				[23, 30],
				[33, 18],
				[51, 6],
				[71, 0],
				[1493, 1],
				[1502, 29],
				[1512, 29],
				[1515, 27],
				[1530, 27],
				[1533, 31],
				[1534, 170],
				[1595, 172],
				[1596, 366],
				[1531, 369],
				[1508, 364],
				[1507, 480],
				[1502, 512],
				[1494, 536],
				[75, 537],
				[61, 534],
				[48, 529],
				[30, 514],
				[17, 494],
				[12, 470],
				[3, 369],
				[1, 331]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-re-xsd-cl",
			"name": "230 SUNSATION RE XSD - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad and bow starboard and port side couches.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-25a01ad174ab2016.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 6664,
			"height": 2282,
			"imageBounds": [
				0,
				0,
				6664,
				2282
			],
			"imageContours": [[
				[0, 1125],
				[2, 980],
				[8, 800],
				[20, 627],
				[35, 461],
				[52, 317],
				[55, 258],
				[68, 199],
				[77, 175],
				[84, 161],
				[109, 119],
				[125, 99],
				[142, 82],
				[172, 57],
				[194, 44],
				[198, 39],
				[219, 28],
				[249, 19],
				[255, 15],
				[276, 7],
				[303, 2],
				[324, 0],
				[364, 0],
				[368, 7],
				[6240, 7],
				[6245, 0],
				[6282, 0],
				[6299, 3],
				[6309, 7],
				[6365, 7],
				[6384, 58],
				[6396, 102],
				[6449, 102],
				[6459, 96],
				[6465, 95],
				[6525, 95],
				[6537, 109],
				[6538, 729],
				[6651, 731],
				[6662, 732],
				[6663, 734],
				[6664, 1552],
				[6662, 1554],
				[6623, 1555],
				[6422, 1558],
				[6421, 1993],
				[6419, 2048],
				[6409, 2128],
				[6398, 2179],
				[6382, 2231],
				[6366, 2275],
				[6310, 2275],
				[6300, 2279],
				[6283, 2282],
				[6245, 2282],
				[6242, 2279],
				[6241, 2275],
				[369, 2275],
				[368, 2279],
				[365, 2282],
				[325, 2282],
				[304, 2280],
				[277, 2275],
				[256, 2267],
				[250, 2263],
				[220, 2254],
				[199, 2243],
				[195, 2238],
				[173, 2225],
				[154, 2210],
				[121, 2176],
				[111, 2164],
				[96, 2141],
				[80, 2111],
				[59, 2049],
				[54, 2e3],
				[53, 1966],
				[36, 1822],
				[21, 1655],
				[9, 1482],
				[3, 1303],
				[1, 1158]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-re-xsd-dl",
			"name": "230 SUNSATION RE XSD - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Includes a rear entry with an L-shaped rear couch accompanied by a sundeck pad, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-b1745083898a7200.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 536,
			"imageBounds": [
				0,
				0,
				1596,
				536
			],
			"imageContours": [[
				[0, 244],
				[4, 153],
				[15, 49],
				[25, 28],
				[36, 16],
				[51, 6],
				[69, 0],
				[1477, 0],
				[1481, 2],
				[1494, 2],
				[1503, 29],
				[1513, 29],
				[1516, 27],
				[1531, 27],
				[1534, 31],
				[1535, 170],
				[1595, 172],
				[1596, 365],
				[1532, 367],
				[1508, 362],
				[1507, 484],
				[1502, 513],
				[1494, 535],
				[1466, 536],
				[1464, 534],
				[89, 534],
				[87, 536],
				[76, 536],
				[54, 530],
				[38, 520],
				[24, 504],
				[15, 483],
				[5, 382],
				[1, 292]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rf-cl",
			"name": "230 SUNSATION RF - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-f6d1f080f141f253.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 537,
			"imageBounds": [
				0,
				0,
				1564,
				537
			],
			"imageContours": [[
				[0, 254],
				[2, 186],
				[5, 141],
				[16, 46],
				[22, 33],
				[27, 26],
				[43, 12],
				[54, 6],
				[78, 0],
				[84, 0],
				[88, 3],
				[1463, 3],
				[1466, 0],
				[1472, 0],
				[1480, 3],
				[1493, 3],
				[1502, 25],
				[1512, 25],
				[1515, 23],
				[1531, 23],
				[1533, 25],
				[1535, 172],
				[1563, 173],
				[1564, 365],
				[1508, 367],
				[1507, 482],
				[1502, 512],
				[1494, 536],
				[72, 537],
				[57, 533],
				[45, 527],
				[37, 521],
				[25, 508],
				[17, 492],
				[14, 476],
				[6, 397],
				[3, 352],
				[1, 284]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rf-dl",
			"name": "230 SUNSATION RF - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-49f53ce997df2bf2.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1593,
			"height": 535,
			"imageBounds": [
				0,
				0,
				1593,
				535
			],
			"imageContours": [[
				[0, 230],
				[2, 182],
				[7, 119],
				[12, 67],
				[14, 53],
				[18, 41],
				[27, 26],
				[41, 13],
				[59, 4],
				[78, 0],
				[85, 0],
				[87, 2],
				[1460, 2],
				[1462, 0],
				[1471, 0],
				[1476, 2],
				[1491, 2],
				[1499, 29],
				[1527, 27],
				[1530, 30],
				[1531, 170],
				[1592, 172],
				[1593, 364],
				[1526, 366],
				[1505, 361],
				[1504, 482],
				[1498, 515],
				[1491, 534],
				[69, 535],
				[48, 527],
				[32, 515],
				[23, 503],
				[17, 490],
				[14, 478],
				[6, 396],
				[1, 306]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rl-cl",
			"name": "230 SUNSATION RL - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-81e8373a186ad3c6.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 536,
			"imageBounds": [
				0,
				0,
				1564,
				536
			],
			"imageContours": [[
				[0, 227],
				[4, 149],
				[13, 57],
				[16, 46],
				[26, 27],
				[38, 15],
				[47, 9],
				[61, 3],
				[77, 0],
				[84, 0],
				[87, 2],
				[1463, 2],
				[1465, 0],
				[1476, 0],
				[1481, 2],
				[1492, 1],
				[1496, 9],
				[1504, 37],
				[1513, 37],
				[1515, 35],
				[1530, 35],
				[1533, 38],
				[1534, 171],
				[1563, 172],
				[1564, 365],
				[1508, 367],
				[1506, 490],
				[1501, 515],
				[1494, 535],
				[67, 536],
				[47, 528],
				[36, 520],
				[24, 506],
				[19, 497],
				[15, 485],
				[5, 388],
				[1, 310]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rl-dl",
			"name": "230 SUNSATION RL - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-7f9b292307c1b13e.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1592,
			"height": 535,
			"imageBounds": [
				0,
				0,
				1592,
				535
			],
			"imageContours": [[
				[0, 230],
				[4, 148],
				[12, 65],
				[16, 46],
				[26, 27],
				[38, 15],
				[47, 9],
				[61, 3],
				[77, 0],
				[1489, 1],
				[1494, 13],
				[1500, 36],
				[1527, 35],
				[1530, 38],
				[1531, 170],
				[1591, 172],
				[1592, 364],
				[1527, 366],
				[1504, 361],
				[1503, 483],
				[1500, 503],
				[1491, 533],
				[1462, 535],
				[1460, 533],
				[88, 533],
				[87, 535],
				[71, 535],
				[50, 528],
				[37, 519],
				[24, 504],
				[19, 495],
				[15, 483],
				[5, 388],
				[1, 306]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rlo-cl",
			"name": "230 SUNSATION RLO - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches and open water panels.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-51e0112121ddf795.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1591,
			"height": 540,
			"imageBounds": [
				0,
				0,
				1591,
				540
			],
			"imageContours": [[
				[0, 241],
				[4, 154],
				[14, 53],
				[18, 41],
				[24, 30],
				[38, 15],
				[52, 6],
				[70, 0],
				[1488, 1],
				[1498, 35],
				[1526, 34],
				[1528, 37],
				[1529, 136],
				[1590, 173],
				[1591, 367],
				[1503, 417],
				[1501, 490],
				[1496, 517],
				[1488, 538],
				[1473, 538],
				[1462, 540],
				[1458, 538],
				[89, 538],
				[87, 540],
				[79, 540],
				[63, 537],
				[41, 526],
				[27, 512],
				[16, 490],
				[13, 472],
				[5, 385],
				[1, 299]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rlo-dl",
			"name": "230 SUNSATION RLO - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch, bow port side chairs, and open water panels.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-f2f310c6c2298153.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1591,
			"height": 541,
			"imageBounds": [
				0,
				0,
				1591,
				541
			],
			"imageContours": [[
				[0, 222],
				[6, 126],
				[13, 56],
				[17, 43],
				[28, 25],
				[40, 14],
				[62, 3],
				[78, 0],
				[85, 0],
				[88, 2],
				[1457, 2],
				[1459, 0],
				[1488, 2],
				[1499, 36],
				[1507, 36],
				[1511, 34],
				[1525, 34],
				[1529, 39],
				[1530, 138],
				[1590, 173],
				[1591, 368],
				[1503, 419],
				[1501, 495],
				[1495, 523],
				[1489, 539],
				[1474, 539],
				[1468, 541],
				[1461, 541],
				[1458, 539],
				[89, 539],
				[87, 541],
				[74, 541],
				[54, 535],
				[39, 526],
				[23, 508],
				[15, 489],
				[5, 392],
				[1, 319]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rs-cl",
			"name": "230 SUNSATION RS - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard and port side couches.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-3fcacb94c2061752.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 6648,
			"height": 2232,
			"imageBounds": [
				0,
				0,
				6648,
				2232
			],
			"imageContours": [[
				[0, 1066],
				[2, 938],
				[8, 789],
				[19, 623],
				[34, 450],
				[51, 309],
				[54, 251],
				[59, 221],
				[79, 164],
				[91, 142],
				[108, 115],
				[124, 96],
				[148, 72],
				[168, 56],
				[189, 44],
				[192, 40],
				[212, 30],
				[215, 27],
				[220, 27],
				[232, 23],
				[243, 19],
				[246, 16],
				[271, 7],
				[300, 2],
				[323, 0],
				[355, 0],
				[360, 4],
				[361, 7],
				[6101, 7],
				[6102, 4],
				[6107, 0],
				[6139, 0],
				[6153, 2],
				[6169, 7],
				[6223, 7],
				[6225, 9],
				[6226, 16],
				[6248, 79],
				[6307, 79],
				[6310, 76],
				[6321, 73],
				[6381, 73],
				[6392, 86],
				[6393, 711],
				[6645, 715],
				[6647, 717],
				[6648, 1519],
				[6616, 1521],
				[6375, 1525],
				[6278, 1504],
				[6276, 2001],
				[6272, 2042],
				[6256, 2126],
				[6241, 2178],
				[6226, 2223],
				[6224, 2225],
				[6170, 2225],
				[6154, 2230],
				[6140, 2232],
				[6108, 2232],
				[6103, 2229],
				[6102, 2225],
				[362, 2225],
				[361, 2229],
				[356, 2232],
				[324, 2232],
				[301, 2230],
				[272, 2225],
				[247, 2216],
				[244, 2213],
				[219, 2204],
				[215, 2204],
				[193, 2192],
				[190, 2188],
				[169, 2176],
				[149, 2160],
				[125, 2136],
				[109, 2117],
				[95, 2095],
				[80, 2068],
				[61, 2014],
				[55, 1981],
				[52, 1923],
				[35, 1783],
				[20, 1610],
				[9, 1444],
				[3, 1294],
				[1, 1167]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-rs-dl",
			"name": "230 SUNSATION RS - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 23,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard side couch and bow port side chairs.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-8213b0cd11190ebd.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1598,
			"height": 537,
			"imageBounds": [
				0,
				0,
				1598,
				537
			],
			"imageContours": [[
				[0, 245],
				[5, 145],
				[13, 61],
				[16, 48],
				[22, 34],
				[29, 24],
				[37, 16],
				[53, 6],
				[71, 0],
				[87, 0],
				[88, 2],
				[1465, 2],
				[1466, 0],
				[1479, 0],
				[1483, 2],
				[1496, 2],
				[1502, 19],
				[1533, 17],
				[1536, 21],
				[1537, 171],
				[1597, 172],
				[1598, 366],
				[1531, 367],
				[1510, 362],
				[1509, 481],
				[1506, 503],
				[1497, 534],
				[1483, 535],
				[1479, 537],
				[1468, 537],
				[1466, 535],
				[89, 535],
				[88, 537],
				[73, 537],
				[52, 530],
				[37, 520],
				[25, 506],
				[20, 497],
				[15, 482],
				[6, 392],
				[1, 292]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rf-cl",
			"name": "250 SUNSATION RF - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9000e710e9fbbfb6.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 496,
			"imageBounds": [
				0,
				0,
				1564,
				496
			],
			"imageContours": [[
				[0, 209],
				[5, 125],
				[13, 47],
				[19, 32],
				[33, 15],
				[47, 6],
				[65, 0],
				[79, 0],
				[81, 2],
				[1470, 2],
				[1472, 0],
				[1483, 0],
				[1486, 2],
				[1498, 1],
				[1506, 22],
				[1533, 21],
				[1536, 24],
				[1537, 158],
				[1563, 159],
				[1564, 337],
				[1512, 339],
				[1511, 449],
				[1509, 462],
				[1500, 494],
				[1487, 494],
				[1484, 496],
				[1473, 496],
				[1472, 494],
				[82, 494],
				[80, 496],
				[66, 496],
				[48, 490],
				[34, 481],
				[22, 467],
				[15, 451],
				[8, 395],
				[1, 287]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rf-dl",
			"name": "250 SUNSATION RF - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-86e98e9898a33f21.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1596,
				508
			],
			"imageContours": [[
				[0, 207],
				[6, 114],
				[12, 53],
				[14, 45],
				[19, 33],
				[33, 16],
				[48, 6],
				[66, 0],
				[81, 0],
				[83, 2],
				[1507, 2],
				[1509, 0],
				[1536, 1],
				[1544, 24],
				[1553, 31],
				[1556, 32],
				[1568, 20],
				[1571, 20],
				[1574, 23],
				[1576, 148],
				[1595, 167],
				[1596, 340],
				[1550, 388],
				[1549, 459],
				[1545, 484],
				[1537, 507],
				[65, 508],
				[46, 501],
				[30, 489],
				[21, 477],
				[14, 459],
				[5, 371],
				[1, 301]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rl-cl",
			"name": "250 SUNSATION RL - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-249e98a13a7f7f54.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 496,
			"imageBounds": [
				0,
				0,
				1564,
				496
			],
			"imageContours": [[
				[0, 234],
				[4, 135],
				[11, 56],
				[14, 43],
				[24, 24],
				[38, 11],
				[57, 2],
				[68, 0],
				[79, 0],
				[81, 2],
				[1471, 2],
				[1472, 0],
				[1483, 0],
				[1487, 2],
				[1498, 2],
				[1500, 4],
				[1509, 34],
				[1516, 34],
				[1521, 32],
				[1533, 32],
				[1535, 34],
				[1536, 158],
				[1562, 158],
				[1563, 162],
				[1564, 333],
				[1563, 337],
				[1512, 338],
				[1511, 443],
				[1509, 463],
				[1507, 473],
				[1499, 494],
				[1486, 494],
				[1484, 496],
				[1473, 496],
				[1472, 494],
				[81, 494],
				[80, 496],
				[68, 496],
				[66, 494],
				[61, 494],
				[50, 490],
				[34, 480],
				[25, 471],
				[17, 458],
				[15, 452],
				[12, 439],
				[5, 361],
				[1, 262]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rl-dl",
			"name": "250 SUNSATION RL - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-341d87afadd117b6.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1595,
			"height": 509,
			"imageBounds": [
				0,
				0,
				1595,
				509
			],
			"imageContours": [[
				[0, 221],
				[4, 138],
				[12, 57],
				[15, 43],
				[24, 26],
				[36, 14],
				[49, 6],
				[70, 0],
				[81, 0],
				[83, 2],
				[1506, 2],
				[1508, 0],
				[1519, 0],
				[1523, 2],
				[1535, 2],
				[1543, 27],
				[1553, 35],
				[1564, 24],
				[1569, 23],
				[1572, 25],
				[1574, 36],
				[1575, 149],
				[1594, 168],
				[1595, 341],
				[1549, 388],
				[1547, 465],
				[1543, 486],
				[1536, 507],
				[1509, 509],
				[1507, 507],
				[84, 507],
				[82, 509],
				[74, 509],
				[56, 505],
				[40, 497],
				[26, 484],
				[15, 462],
				[5, 371],
				[1, 288]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rlo-cl",
			"name": "250 SUNSATION RLO - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches and open water panels.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-6e309e8c74404a89.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1595,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1595,
				508
			],
			"imageContours": [[
				[0, 193],
				[3, 142],
				[11, 57],
				[15, 41],
				[21, 29],
				[36, 13],
				[50, 5],
				[66, 0],
				[1534, 1],
				[1543, 27],
				[1551, 34],
				[1553, 35],
				[1565, 23],
				[1569, 23],
				[1572, 26],
				[1574, 148],
				[1594, 168],
				[1595, 340],
				[1549, 387],
				[1547, 463],
				[1541, 492],
				[1535, 507],
				[67, 508],
				[51, 503],
				[37, 495],
				[22, 479],
				[16, 467],
				[12, 451],
				[4, 366],
				[1, 315]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rlo-dl",
			"name": "250 SUNSATION RLO - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch, bow port side chairs, and open water panels.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-0bdf4546d84c3712.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1597,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1597,
				508
			],
			"imageContours": [[
				[0, 195],
				[5, 119],
				[13, 47],
				[18, 34],
				[31, 17],
				[42, 9],
				[64, 0],
				[1536, 1],
				[1545, 27],
				[1555, 35],
				[1568, 22],
				[1572, 23],
				[1574, 26],
				[1576, 148],
				[1595, 167],
				[1596, 179],
				[1597, 329],
				[1596, 341],
				[1551, 387],
				[1549, 462],
				[1544, 488],
				[1537, 507],
				[65, 508],
				[50, 503],
				[32, 491],
				[19, 474],
				[14, 461],
				[6, 389],
				[1, 313]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rs-cl",
			"name": "250 SUNSATION RS - CL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard and port side couches.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-f9142a5d536c37bf.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 6656,
			"height": 2118,
			"imageBounds": [
				0,
				0,
				6656,
				2118
			],
			"imageContours": [[
				[0, 1044],
				[2, 900],
				[9, 735],
				[18, 590],
				[33, 423],
				[48, 296],
				[51, 239],
				[54, 222],
				[64, 185],
				[71, 164],
				[98, 115],
				[120, 89],
				[141, 68],
				[156, 56],
				[180, 41],
				[185, 36],
				[198, 30],
				[203, 26],
				[213, 24],
				[258, 6],
				[300, 0],
				[338, 0],
				[343, 6],
				[6292, 6],
				[6295, 0],
				[6329, 0],
				[6332, 2],
				[6344, 3],
				[6355, 7],
				[6407, 6],
				[6410, 9],
				[6411, 17],
				[6431, 75],
				[6486, 75],
				[6494, 70],
				[6557, 70],
				[6563, 75],
				[6568, 83],
				[6569, 614],
				[6655, 702],
				[6656, 1416],
				[6460, 1618],
				[6459, 1837],
				[6455, 1922],
				[6448, 1973],
				[6439, 2016],
				[6427, 2058],
				[6412, 2100],
				[6411, 2109],
				[6408, 2112],
				[6356, 2111],
				[6345, 2115],
				[6333, 2116],
				[6330, 2118],
				[6296, 2118],
				[6293, 2112],
				[344, 2112],
				[339, 2118],
				[307, 2118],
				[301, 2116],
				[281, 2115],
				[259, 2111],
				[242, 2104],
				[232, 2102],
				[204, 2091],
				[184, 2080],
				[157, 2062],
				[142, 2050],
				[121, 2029],
				[99, 2003],
				[72, 1954],
				[65, 1933],
				[55, 1896],
				[52, 1879],
				[49, 1822],
				[34, 1695],
				[19, 1527],
				[10, 1383],
				[3, 1218],
				[1, 1073]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-rs-dl",
			"name": "250 SUNSATION RS - DL",
			"family": "Sunsation",
			"familyKey": "sunsation",
			"nominalLengthFt": 25,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard side couch and bow port side chairs.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-e2d574d4218f70db.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1595,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1595,
				508
			],
			"imageContours": [[
				[0, 220],
				[4, 139],
				[12, 57],
				[15, 44],
				[24, 26],
				[37, 13],
				[48, 6],
				[66, 0],
				[1535, 1],
				[1541, 18],
				[1570, 16],
				[1573, 19],
				[1574, 147],
				[1594, 168],
				[1595, 340],
				[1549, 387],
				[1548, 453],
				[1544, 482],
				[1536, 506],
				[1523, 506],
				[1518, 508],
				[1509, 508],
				[1507, 506],
				[84, 506],
				[82, 508],
				[72, 508],
				[55, 504],
				[40, 496],
				[27, 484],
				[17, 467],
				[13, 451],
				[8, 402],
				[1, 288]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-210-sunsation-angler-4pt-cl",
			"name": "210 SUNSATION ANGLER 4PT - CL",
			"family": "Sunsation Angler",
			"familyKey": "sunsation-angler",
			"nominalLengthFt": 21,
			"description": "Features dual rear fishing chairs and shorter L-shaped rear couch with bow starboard and port side fishing chairs.",
			"lengthIn": 273,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-a71514d0011bb6a5.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation-angler/",
			"sourceDimensions": {
				"length": "22' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1562,
			"height": 583,
			"imageBounds": [
				0,
				0,
				1562,
				583
			],
			"imageContours": [[
				[0, 242],
				[6, 144],
				[15, 56],
				[19, 44],
				[25, 33],
				[36, 20],
				[53, 8],
				[68, 2],
				[79, 0],
				[93, 0],
				[94, 2],
				[1191, 2],
				[1192, 0],
				[1209, 0],
				[1211, 2],
				[1453, 2],
				[1455, 0],
				[1485, 2],
				[1494, 26],
				[1507, 26],
				[1509, 24],
				[1526, 24],
				[1529, 27],
				[1530, 186],
				[1561, 187],
				[1562, 397],
				[1501, 398],
				[1500, 525],
				[1494, 559],
				[1486, 581],
				[1455, 583],
				[1454, 581],
				[96, 581],
				[94, 583],
				[82, 583],
				[74, 582],
				[57, 576],
				[40, 565],
				[25, 547],
				[16, 525],
				[7, 440],
				[1, 340]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-angler-2pt-cl",
			"name": "230 SUNSATION ANGLER 2PT - CL",
			"family": "Sunsation Angler",
			"familyKey": "sunsation-angler",
			"nominalLengthFt": 23,
			"description": "Features dual rear fishing chairs and shorter L-shaped rear couch with bow starboard and port side couches.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-91c03d3834741638.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation-angler/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1563,
			"height": 535,
			"imageBounds": [
				0,
				0,
				1563,
				535
			],
			"imageContours": [[
				[0, 241],
				[4, 152],
				[13, 57],
				[15, 49],
				[21, 34],
				[35, 17],
				[52, 6],
				[72, 0],
				[86, 0],
				[87, 2],
				[1207, 2],
				[1208, 0],
				[1229, 0],
				[1231, 2],
				[1349, 2],
				[1351, 0],
				[1374, 0],
				[1375, 2],
				[1462, 2],
				[1463, 0],
				[1492, 1],
				[1501, 29],
				[1510, 29],
				[1513, 27],
				[1530, 27],
				[1532, 30],
				[1533, 167],
				[1562, 168],
				[1563, 361],
				[1535, 362],
				[1534, 366],
				[1525, 365],
				[1524, 362],
				[1507, 363],
				[1506, 475],
				[1503, 500],
				[1494, 532],
				[1481, 533],
				[1477, 535],
				[69, 535],
				[54, 530],
				[39, 521],
				[27, 509],
				[16, 487],
				[14, 479],
				[5, 384],
				[1, 294]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-sunsation-angler-4pt-cl",
			"name": "230 SUNSATION ANGLER 4PT - CL",
			"family": "Sunsation Angler",
			"familyKey": "sunsation-angler",
			"nominalLengthFt": 23,
			"description": "Features dual rear fishing chairs and shorter L-shaped rear couch with bow starboard and port side fishing chairs.",
			"lengthIn": 297,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-efa7e9bf8fa07787.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation-angler/",
			"sourceDimensions": {
				"length": "24' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 536,
			"imageBounds": [
				0,
				0,
				1564,
				536
			],
			"imageContours": [[
				[0, 207],
				[6, 121],
				[12, 62],
				[15, 46],
				[21, 33],
				[33, 18],
				[47, 8],
				[69, 0],
				[1478, 0],
				[1482, 2],
				[1493, 1],
				[1495, 3],
				[1501, 23],
				[1514, 23],
				[1517, 21],
				[1532, 22],
				[1534, 24],
				[1535, 171],
				[1563, 172],
				[1564, 366],
				[1509, 367],
				[1508, 478],
				[1505, 503],
				[1495, 535],
				[68, 536],
				[49, 529],
				[35, 519],
				[23, 505],
				[15, 487],
				[6, 404],
				[1, 330]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-angler-2pt-cl",
			"name": "250 SUNSATION ANGLER 2PT - CL",
			"family": "Sunsation Angler",
			"familyKey": "sunsation-angler",
			"nominalLengthFt": 25,
			"description": "Features dual rear fishing chairs and shorter L-shaped rear couch with bow starboard and port side couches.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-0e4c78671750d587.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation-angler/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1562,
			"height": 496,
			"imageBounds": [
				0,
				0,
				1562,
				496
			],
			"imageContours": [[
				[0, 197],
				[5, 118],
				[13, 46],
				[21, 28],
				[35, 13],
				[49, 5],
				[65, 0],
				[79, 0],
				[81, 2],
				[1221, 2],
				[1222, 0],
				[1252, 0],
				[1255, 2],
				[1325, 2],
				[1328, 0],
				[1358, 0],
				[1359, 2],
				[1475, 2],
				[1476, 0],
				[1503, 1],
				[1511, 22],
				[1521, 22],
				[1523, 20],
				[1538, 20],
				[1541, 23],
				[1542, 144],
				[1561, 164],
				[1562, 333],
				[1517, 379],
				[1516, 450],
				[1512, 473],
				[1505, 495],
				[64, 496],
				[45, 489],
				[32, 480],
				[20, 465],
				[14, 450],
				[6, 379],
				[1, 300]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-sunsation-angler-6pt-cl",
			"name": "250 SUNSATION ANGLER 6PT - CL",
			"family": "Sunsation Angler",
			"familyKey": "sunsation-angler",
			"nominalLengthFt": 25,
			"description": "Features dual rear fishing chairs and shorter L-shaped rear couch with four bow starboard and port side fishing chairs.",
			"lengthIn": 321,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9dee021d3cd4b30e.webp",
			"sourcePage": "https://www.pontoons.com/models/sunsation-angler/",
			"sourceDimensions": {
				"length": "26' 9\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1562,
			"height": 498,
			"imageBounds": [
				0,
				0,
				1562,
				498
			],
			"imageContours": [[
				[0, 197],
				[11, 57],
				[16, 39],
				[25, 24],
				[38, 12],
				[66, 0],
				[79, 0],
				[80, 2],
				[1222, 2],
				[1223, 0],
				[1255, 0],
				[1258, 2],
				[1321, 2],
				[1324, 0],
				[1357, 0],
				[1358, 2],
				[1476, 2],
				[1477, 0],
				[1487, 0],
				[1490, 2],
				[1503, 2],
				[1511, 23],
				[1539, 22],
				[1541, 25],
				[1542, 146],
				[1561, 165],
				[1562, 335],
				[1517, 380],
				[1515, 459],
				[1509, 486],
				[1504, 497],
				[63, 498],
				[38, 487],
				[23, 472],
				[14, 452],
				[6, 378],
				[1, 302]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rf-cl",
			"name": "230 SOLARIS RF - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-fed1d4eeff811cda.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 539,
			"imageBounds": [
				0,
				0,
				1564,
				539
			],
			"imageContours": [[
				[0, 254],
				[4, 147],
				[13, 57],
				[15, 49],
				[22, 33],
				[35, 17],
				[51, 6],
				[68, 1],
				[77, 0],
				[86, 0],
				[88, 2],
				[1470, 2],
				[1472, 0],
				[1484, 0],
				[1488, 2],
				[1500, 2],
				[1502, 4],
				[1510, 28],
				[1521, 37],
				[1531, 25],
				[1537, 23],
				[1540, 26],
				[1542, 38],
				[1543, 158],
				[1563, 178],
				[1564, 361],
				[1515, 412],
				[1514, 486],
				[1509, 517],
				[1501, 538],
				[75, 539],
				[53, 533],
				[39, 525],
				[27, 513],
				[16, 491],
				[5, 392],
				[1, 285]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rf-dl",
			"name": "230 SOLARIS RF - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-56b8e859a49acbd3.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1598,
			"height": 550,
			"imageBounds": [
				0,
				0,
				1598,
				550
			],
			"imageContours": [[
				[0, 226],
				[6, 132],
				[15, 51],
				[23, 33],
				[39, 15],
				[53, 6],
				[74, 0],
				[1533, 1],
				[1542, 28],
				[1553, 37],
				[1567, 24],
				[1571, 24],
				[1574, 27],
				[1576, 160],
				[1597, 181],
				[1598, 369],
				[1548, 420],
				[1547, 497],
				[1541, 530],
				[1534, 549],
				[73, 550],
				[54, 544],
				[40, 536],
				[24, 518],
				[16, 500],
				[7, 418],
				[1, 325]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rl-cl",
			"name": "230 SOLARIS RL - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-4227d2c7ab4a08e7.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 540,
			"imageBounds": [
				0,
				0,
				1564,
				540
			],
			"imageContours": [[
				[0, 265],
				[4, 148],
				[15, 50],
				[26, 28],
				[40, 14],
				[60, 4],
				[78, 0],
				[85, 0],
				[87, 2],
				[1471, 2],
				[1472, 0],
				[1479, 0],
				[1483, 2],
				[1500, 2],
				[1509, 29],
				[1518, 37],
				[1522, 37],
				[1534, 25],
				[1537, 25],
				[1540, 28],
				[1542, 43],
				[1543, 159],
				[1563, 180],
				[1564, 362],
				[1515, 413],
				[1514, 484],
				[1511, 506],
				[1502, 537],
				[1486, 538],
				[1485, 540],
				[1472, 540],
				[1471, 538],
				[88, 538],
				[87, 540],
				[76, 540],
				[74, 538],
				[68, 538],
				[52, 533],
				[42, 527],
				[30, 516],
				[24, 508],
				[16, 491],
				[5, 393],
				[1, 277]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rl-dl",
			"name": "230 SOLARIS RL - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-11c8e119bac33cd5.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 551,
			"imageBounds": [
				0,
				0,
				1600,
				551
			],
			"imageContours": [[
				[0, 211],
				[7, 111],
				[12, 62],
				[16, 46],
				[27, 26],
				[37, 16],
				[53, 6],
				[73, 0],
				[1535, 1],
				[1544, 29],
				[1555, 38],
				[1569, 25],
				[1573, 25],
				[1576, 28],
				[1578, 161],
				[1599, 182],
				[1600, 369],
				[1550, 421],
				[1548, 504],
				[1544, 526],
				[1536, 550],
				[74, 551],
				[53, 545],
				[41, 538],
				[27, 524],
				[18, 508],
				[14, 496],
				[8, 440],
				[1, 340]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rlo-cl",
			"name": "230 SOLARIS RLO - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches and open water panels",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-464749219eb62dc2.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1593,
			"height": 555,
			"imageBounds": [
				0,
				0,
				1593,
				555
			],
			"imageContours": [[
				[0, 235],
				[4, 157],
				[12, 70],
				[15, 52],
				[24, 32],
				[35, 19],
				[53, 7],
				[76, 0],
				[88, 0],
				[90, 2],
				[1496, 2],
				[1497, 0],
				[1511, 0],
				[1515, 2],
				[1527, 1],
				[1537, 30],
				[1547, 38],
				[1559, 26],
				[1565, 25],
				[1568, 27],
				[1570, 39],
				[1571, 162],
				[1592, 183],
				[1593, 372],
				[1543, 423],
				[1541, 505],
				[1535, 535],
				[1529, 553],
				[1499, 555],
				[1497, 553],
				[92, 553],
				[90, 555],
				[74, 555],
				[55, 549],
				[39, 539],
				[26, 525],
				[17, 507],
				[13, 486],
				[5, 399],
				[1, 320]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rlo-dl",
			"name": "230 SOLARIS RLO - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch, bow port side chairs, and open water panels.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9f203ddc7b8bb946.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 555,
			"imageBounds": [
				0,
				0,
				1596,
				555
			],
			"imageContours": [[
				[0, 219],
				[6, 128],
				[13, 57],
				[15, 50],
				[22, 34],
				[33, 20],
				[53, 6],
				[72, 0],
				[1530, 1],
				[1539, 29],
				[1550, 38],
				[1561, 26],
				[1565, 24],
				[1569, 25],
				[1571, 28],
				[1573, 161],
				[1595, 184],
				[1596, 359],
				[1595, 372],
				[1545, 424],
				[1543, 509],
				[1537, 537],
				[1532, 552],
				[1530, 554],
				[71, 555],
				[54, 549],
				[38, 539],
				[24, 523],
				[16, 505],
				[14, 498],
				[6, 416],
				[1, 337]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rs-cl",
			"name": "230 SOLARIS RS - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard and port side couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-f38e85efe6ee0943.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 550,
			"imageBounds": [
				0,
				0,
				1596,
				550
			],
			"imageContours": [[
				[0, 205],
				[3, 156],
				[12, 61],
				[18, 40],
				[27, 26],
				[41, 13],
				[53, 6],
				[72, 0],
				[1513, 0],
				[1517, 2],
				[1530, 1],
				[1532, 2],
				[1541, 32],
				[1548, 38],
				[1550, 38],
				[1561, 26],
				[1566, 25],
				[1569, 27],
				[1571, 41],
				[1572, 158],
				[1595, 181],
				[1596, 369],
				[1546, 420],
				[1545, 497],
				[1540, 526],
				[1533, 548],
				[1531, 549],
				[72, 550],
				[54, 544],
				[38, 534],
				[27, 523],
				[19, 510],
				[13, 489],
				[4, 394],
				[1, 345]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-solaris-rs-dl",
			"name": "230 SOLARIS RS - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 23,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard side couch and bow port side chairs.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-ffd160678df22948.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1590,
			"height": 548,
			"imageBounds": [
				0,
				0,
				1590,
				548
			],
			"imageContours": [[
				[0, 217],
				[7, 113],
				[13, 56],
				[16, 46],
				[27, 26],
				[37, 16],
				[53, 6],
				[72, 0],
				[1506, 0],
				[1511, 2],
				[1525, 2],
				[1535, 32],
				[1542, 38],
				[1544, 38],
				[1557, 25],
				[1560, 25],
				[1563, 28],
				[1565, 42],
				[1566, 158],
				[1589, 181],
				[1590, 367],
				[1540, 418],
				[1539, 495],
				[1534, 524],
				[1527, 546],
				[1525, 547],
				[73, 548],
				[54, 542],
				[38, 532],
				[25, 518],
				[16, 499],
				[13, 484],
				[6, 413],
				[1, 331]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rf-cl",
			"name": "250 SOLARIS RF - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-dafb0307d7c93395.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 498,
			"imageBounds": [
				0,
				0,
				1564,
				498
			],
			"imageContours": [[
				[0, 218],
				[3, 145],
				[12, 50],
				[18, 34],
				[31, 17],
				[48, 6],
				[67, 0],
				[79, 0],
				[81, 2],
				[1477, 2],
				[1479, 0],
				[1490, 0],
				[1493, 2],
				[1506, 3],
				[1514, 27],
				[1523, 34],
				[1536, 22],
				[1539, 22],
				[1542, 25],
				[1544, 146],
				[1563, 165],
				[1564, 334],
				[1519, 380],
				[1517, 454],
				[1514, 475],
				[1506, 497],
				[64, 498],
				[46, 492],
				[32, 482],
				[19, 465],
				[13, 449],
				[4, 354],
				[1, 281]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rf-dl",
			"name": "250 SOLARIS RF - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9e1bc98935963148.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1594,
				508
			],
			"imageContours": [[
				[0, 207],
				[3, 148],
				[13, 49],
				[21, 30],
				[34, 15],
				[48, 6],
				[66, 0],
				[1534, 1],
				[1542, 26],
				[1553, 35],
				[1564, 23],
				[1569, 22],
				[1572, 25],
				[1574, 148],
				[1593, 167],
				[1594, 340],
				[1548, 388],
				[1547, 457],
				[1543, 482],
				[1536, 505],
				[1523, 506],
				[1519, 508],
				[1508, 508],
				[1506, 506],
				[83, 506],
				[82, 508],
				[69, 508],
				[52, 503],
				[33, 491],
				[21, 476],
				[15, 462],
				[13, 454],
				[5, 371],
				[1, 300]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rl-cl",
			"name": "250 SOLARIS RL - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-964039fa1397dbf8.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1564,
			"height": 498,
			"imageBounds": [
				0,
				0,
				1564,
				498
			],
			"imageContours": [[
				[0, 202],
				[4, 131],
				[13, 46],
				[19, 31],
				[32, 15],
				[45, 6],
				[62, 0],
				[1504, 0],
				[1506, 1],
				[1514, 26],
				[1524, 34],
				[1534, 23],
				[1540, 22],
				[1542, 24],
				[1544, 37],
				[1545, 145],
				[1563, 164],
				[1564, 333],
				[1519, 380],
				[1518, 448],
				[1514, 473],
				[1507, 496],
				[1495, 496],
				[1491, 498],
				[1480, 498],
				[1478, 496],
				[82, 496],
				[80, 498],
				[67, 498],
				[48, 492],
				[33, 482],
				[20, 466],
				[15, 454],
				[12, 438],
				[5, 366],
				[1, 295]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rl-dl",
			"name": "250 SOLARIS RL - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-3b09798627a5eab8.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1596,
				508
			],
			"imageContours": [[
				[0, 230],
				[4, 141],
				[14, 47],
				[21, 31],
				[36, 14],
				[49, 6],
				[68, 0],
				[1535, 1],
				[1537, 3],
				[1544, 27],
				[1554, 35],
				[1565, 24],
				[1571, 23],
				[1573, 25],
				[1575, 37],
				[1576, 149],
				[1595, 168],
				[1596, 340],
				[1550, 388],
				[1548, 465],
				[1542, 493],
				[1538, 505],
				[1536, 507],
				[68, 508],
				[50, 502],
				[37, 494],
				[26, 483],
				[16, 464],
				[13, 450],
				[5, 367],
				[1, 278]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rlo-cl",
			"name": "250 SOLARIS RLO - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches and open water panels.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9a7dcf6b2ae1a947.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1598,
			"height": 510,
			"imageBounds": [
				0,
				0,
				1598,
				510
			],
			"imageContours": [[
				[0, 219],
				[5, 128],
				[12, 57],
				[16, 41],
				[26, 24],
				[38, 13],
				[58, 3],
				[74, 0],
				[81, 0],
				[84, 2],
				[1508, 2],
				[1510, 0],
				[1538, 2],
				[1546, 28],
				[1556, 36],
				[1567, 24],
				[1571, 23],
				[1575, 26],
				[1577, 40],
				[1578, 150],
				[1597, 169],
				[1598, 341],
				[1552, 388],
				[1550, 465],
				[1545, 490],
				[1539, 508],
				[1511, 510],
				[1509, 508],
				[85, 508],
				[82, 510],
				[75, 510],
				[59, 507],
				[39, 497],
				[27, 486],
				[17, 469],
				[13, 453],
				[6, 382],
				[1, 291]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rlo-dl",
			"name": "250 SOLARIS RLO - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch, bow port side chairs, and open water panels.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-38eb5bda13ab91d3.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1594,
				508
			],
			"imageContours": [[
				[0, 210],
				[5, 126],
				[12, 53],
				[14, 46],
				[20, 32],
				[33, 16],
				[51, 5],
				[67, 0],
				[1533, 1],
				[1535, 3],
				[1543, 28],
				[1552, 35],
				[1564, 23],
				[1569, 23],
				[1572, 27],
				[1574, 148],
				[1593, 168],
				[1594, 340],
				[1548, 388],
				[1546, 467],
				[1541, 490],
				[1536, 505],
				[1534, 507],
				[68, 508],
				[52, 503],
				[33, 491],
				[21, 476],
				[15, 462],
				[13, 455],
				[6, 382],
				[1, 298]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rs-cl",
			"name": "250 SOLARIS RS - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-b3403db7414149bc.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1597,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1597,
				508
			],
			"imageContours": [[
				[0, 221],
				[4, 142],
				[14, 48],
				[21, 31],
				[36, 14],
				[50, 5],
				[65, 0],
				[1537, 1],
				[1546, 30],
				[1551, 34],
				[1553, 35],
				[1565, 23],
				[1570, 23],
				[1572, 25],
				[1574, 145],
				[1596, 167],
				[1597, 340],
				[1551, 387],
				[1549, 464],
				[1543, 493],
				[1537, 507],
				[67, 508],
				[52, 503],
				[36, 493],
				[22, 477],
				[14, 457],
				[5, 365],
				[1, 287]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-rs-dl",
			"name": "250 SOLARIS RS - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Includes a rear social area equipped with a bench, table, dual chairs, and open water panels coupled with bow starboard side couch and bow port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-aca5e4d7167a77a5.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 508,
			"imageBounds": [
				0,
				0,
				1594,
				508
			],
			"imageContours": [[
				[0, 198],
				[6, 110],
				[12, 53],
				[15, 42],
				[22, 28],
				[33, 16],
				[50, 5],
				[66, 0],
				[1534, 1],
				[1543, 29],
				[1547, 33],
				[1551, 35],
				[1563, 23],
				[1567, 23],
				[1569, 25],
				[1571, 38],
				[1572, 146],
				[1593, 167],
				[1594, 340],
				[1548, 388],
				[1547, 459],
				[1542, 487],
				[1535, 506],
				[1522, 506],
				[1518, 508],
				[1508, 508],
				[1506, 506],
				[83, 506],
				[82, 508],
				[68, 508],
				[49, 502],
				[34, 492],
				[24, 481],
				[16, 466],
				[13, 456],
				[7, 398],
				[1, 310]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-upper-deck-cl",
			"name": "250 SOLARIS UPPER DECK - CL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Features rear entry and an L-shaped rear couch with upper deck and bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-9b905c8107a31016.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1346,
			"height": 429,
			"imageBounds": [
				0,
				0,
				1346,
				429
			],
			"imageContours": [[
				[0, 176],
				[4, 105],
				[10, 45],
				[12, 37],
				[17, 26],
				[28, 13],
				[35, 8],
				[48, 2],
				[55, 0],
				[485, 0],
				[487, 413],
				[491, 413],
				[492, 0],
				[494, 0],
				[497, 3],
				[1106, 3],
				[1109, 0],
				[1111, 0],
				[1112, 117],
				[1117, 122],
				[1118, 0],
				[1295, 1],
				[1301, 18],
				[1305, 43],
				[1306, 102],
				[1345, 142],
				[1346, 287],
				[1330, 303],
				[1329, 402],
				[1328, 411],
				[1326, 414],
				[1321, 413],
				[1311, 400],
				[1303, 407],
				[1296, 427],
				[1274, 429],
				[1272, 427],
				[1109, 427],
				[1106, 429],
				[1105, 107],
				[1101, 106],
				[1099, 429],
				[1097, 429],
				[1096, 106],
				[1037, 106],
				[1036, 429],
				[1034, 429],
				[1033, 107],
				[1029, 106],
				[1027, 429],
				[1025, 429],
				[1024, 427],
				[1020, 427],
				[1017, 429],
				[1016, 125],
				[1012, 121],
				[1011, 429],
				[1008, 429],
				[1005, 426],
				[498, 426],
				[495, 429],
				[493, 429],
				[492, 425],
				[487, 425],
				[486, 429],
				[484, 426],
				[482, 429],
				[478, 427],
				[71, 427],
				[68, 429],
				[63, 429],
				[48, 426],
				[33, 418],
				[22, 408],
				[15, 396],
				[11, 383],
				[6, 335],
				[1, 252]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-solaris-upper-deck-dl",
			"name": "250 SOLARIS UPPER DECK - DL",
			"family": "Solaris",
			"familyKey": "solaris",
			"nominalLengthFt": 25,
			"description": "Features rear entry and an L-shaped rear couch with upper deck and bow starboard couch and port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-d7bd2b53ba975b88.webp",
			"sourcePage": "https://www.pontoons.com/models/solaris/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1354,
			"height": 432,
			"imageBounds": [
				0,
				0,
				1354,
				432
			],
			"imageContours": [[
				[0, 160],
				[4, 101],
				[11, 39],
				[17, 26],
				[28, 13],
				[35, 8],
				[51, 1],
				[484, 0],
				[486, 2],
				[488, 0],
				[489, 416],
				[493, 416],
				[494, 0],
				[497, 0],
				[500, 3],
				[1113, 3],
				[1116, 0],
				[1118, 0],
				[1119, 118],
				[1123, 122],
				[1124, 0],
				[1303, 1],
				[1310, 23],
				[1313, 43],
				[1314, 102],
				[1353, 142],
				[1354, 289],
				[1338, 306],
				[1337, 406],
				[1336, 414],
				[1334, 417],
				[1330, 417],
				[1319, 403],
				[1311, 410],
				[1304, 430],
				[1294, 430],
				[1290, 432],
				[1281, 432],
				[1279, 430],
				[1115, 430],
				[1114, 432],
				[1112, 432],
				[1111, 107],
				[1107, 107],
				[1106, 114],
				[1105, 432],
				[1103, 107],
				[1043, 107],
				[1042, 432],
				[1040, 432],
				[1038, 107],
				[1034, 108],
				[1033, 432],
				[1031, 432],
				[1030, 430],
				[1026, 430],
				[1025, 432],
				[1023, 432],
				[1022, 126],
				[1018, 122],
				[1017, 432],
				[1014, 432],
				[1011, 429],
				[501, 429],
				[498, 432],
				[496, 432],
				[495, 428],
				[490, 428],
				[488, 432],
				[487, 428],
				[485, 432],
				[480, 430],
				[71, 430],
				[69, 432],
				[59, 432],
				[42, 427],
				[31, 420],
				[21, 410],
				[13, 395],
				[11, 388],
				[6, 342],
				[1, 272]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-rf-cl",
			"name": "230 INTRIGUE RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-a3c985253945ada6.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 546,
			"imageBounds": [
				0,
				0,
				1596,
				546
			],
			"imageContours": [[
				[0, 216],
				[6, 123],
				[12, 64],
				[15, 49],
				[23, 32],
				[37, 16],
				[51, 7],
				[65, 2],
				[76, 0],
				[86, 0],
				[88, 2],
				[1523, 2],
				[1525, 0],
				[1534, 0],
				[1543, 3],
				[1549, 9],
				[1552, 17],
				[1553, 33],
				[1559, 34],
				[1573, 45],
				[1575, 45],
				[1585, 33],
				[1591, 32],
				[1594, 34],
				[1595, 44],
				[1596, 116],
				[1595, 126],
				[1593, 130],
				[1590, 131],
				[1586, 129],
				[1584, 126],
				[1583, 366],
				[1554, 396],
				[1553, 529],
				[1550, 537],
				[1544, 543],
				[1535, 546],
				[1526, 546],
				[1524, 544],
				[89, 544],
				[87, 546],
				[77, 546],
				[66, 544],
				[52, 539],
				[38, 530],
				[24, 514],
				[16, 497],
				[13, 482],
				[7, 423],
				[1, 330]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-gt-rf-cl",
			"name": "230 INTRIGUE GT RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "GT styling featuring both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-6cdc342473ac15e3.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1599,
			"height": 546,
			"imageBounds": [
				0,
				0,
				1599,
				546
			],
			"imageContours": [[
				[0, 202],
				[6, 117],
				[12, 59],
				[15, 47],
				[24, 29],
				[37, 15],
				[52, 6],
				[71, 0],
				[1540, 0],
				[1549, 4],
				[1553, 9],
				[1556, 18],
				[1557, 32],
				[1565, 35],
				[1578, 45],
				[1590, 32],
				[1596, 32],
				[1598, 34],
				[1599, 120],
				[1598, 128],
				[1596, 130],
				[1592, 130],
				[1588, 126],
				[1587, 366],
				[1558, 396],
				[1557, 528],
				[1552, 540],
				[1547, 544],
				[1541, 546],
				[72, 546],
				[52, 540],
				[38, 531],
				[25, 517],
				[16, 499],
				[13, 487],
				[7, 429],
				[1, 344]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-rf-dl",
			"name": "230 INTRIGUE RF - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-7a62e57c500f185b.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1597,
			"height": 546,
			"imageBounds": [
				0,
				0,
				1597,
				546
			],
			"imageContours": [[
				[0, 227],
				[7, 117],
				[13, 59],
				[18, 42],
				[29, 24],
				[41, 13],
				[62, 3],
				[76, 0],
				[87, 0],
				[89, 2],
				[1524, 2],
				[1525, 0],
				[1535, 0],
				[1544, 3],
				[1550, 9],
				[1553, 17],
				[1554, 33],
				[1560, 34],
				[1575, 45],
				[1586, 33],
				[1592, 32],
				[1595, 34],
				[1596, 44],
				[1597, 116],
				[1596, 126],
				[1594, 130],
				[1589, 130],
				[1585, 126],
				[1584, 366],
				[1555, 396],
				[1554, 529],
				[1551, 537],
				[1545, 543],
				[1536, 546],
				[1526, 546],
				[1525, 544],
				[90, 544],
				[88, 546],
				[70, 545],
				[48, 537],
				[36, 528],
				[23, 512],
				[15, 492],
				[5, 395],
				[1, 319]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-rl-cl",
			"name": "230 INTRIGUE RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-706b85ae9a24da20.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 544,
			"imageBounds": [
				0,
				0,
				1596,
				544
			],
			"imageContours": [[
				[0, 239],
				[5, 143],
				[13, 59],
				[15, 50],
				[22, 33],
				[26, 27],
				[39, 14],
				[57, 4],
				[69, 0],
				[1538, 0],
				[1544, 3],
				[1551, 13],
				[1554, 33],
				[1560, 34],
				[1574, 45],
				[1584, 33],
				[1590, 31],
				[1594, 35],
				[1595, 45],
				[1596, 112],
				[1594, 128],
				[1588, 130],
				[1584, 126],
				[1583, 365],
				[1575, 373],
				[1574, 397],
				[1572, 401],
				[1564, 402],
				[1554, 410],
				[1553, 522],
				[1552, 531],
				[1549, 537],
				[1540, 544],
				[70, 544],
				[57, 540],
				[47, 535],
				[36, 527],
				[23, 511],
				[17, 498],
				[14, 485],
				[7, 414],
				[1, 306]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-gt-rl-cl",
			"name": "230 INTRIGUE GT RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "GT styling featuring a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-c35fde8b8c47dc84.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 546,
			"imageBounds": [
				0,
				0,
				1600,
				546
			],
			"imageContours": [[
				[0, 221],
				[4, 149],
				[14, 52],
				[22, 33],
				[32, 20],
				[40, 13],
				[52, 6],
				[72, 0],
				[1541, 0],
				[1548, 3],
				[1554, 10],
				[1558, 33],
				[1564, 34],
				[1578, 45],
				[1590, 32],
				[1596, 32],
				[1598, 34],
				[1599, 43],
				[1600, 117],
				[1599, 127],
				[1597, 130],
				[1591, 129],
				[1588, 125],
				[1587, 366],
				[1579, 374],
				[1578, 400],
				[1572, 404],
				[1569, 403],
				[1558, 411],
				[1557, 528],
				[1555, 536],
				[1552, 540],
				[1549, 543],
				[1542, 546],
				[73, 546],
				[67, 545],
				[46, 536],
				[33, 526],
				[23, 513],
				[15, 494],
				[5, 397],
				[1, 325]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-rl-dl",
			"name": "230 INTRIGUE RL - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-cc5951077f73998f.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 544,
			"imageBounds": [
				0,
				0,
				1596,
				544
			],
			"imageContours": [[
				[0, 243],
				[4, 159],
				[15, 51],
				[23, 32],
				[37, 16],
				[55, 5],
				[70, 0],
				[1538, 0],
				[1545, 4],
				[1549, 9],
				[1551, 15],
				[1552, 32],
				[1561, 35],
				[1573, 45],
				[1584, 33],
				[1590, 31],
				[1593, 34],
				[1595, 46],
				[1596, 110],
				[1593, 129],
				[1588, 130],
				[1584, 127],
				[1583, 364],
				[1574, 373],
				[1573, 399],
				[1570, 402],
				[1564, 402],
				[1553, 411],
				[1552, 529],
				[1548, 538],
				[1539, 544],
				[70, 544],
				[55, 539],
				[40, 530],
				[25, 514],
				[16, 494],
				[5, 385],
				[1, 301]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-rlo-cl",
			"name": "230 INTRIGUE RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features open water panels with a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-09a7c7b3a2bb170b.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1592,
			"height": 544,
			"imageBounds": [
				0,
				0,
				1592,
				544
			],
			"imageContours": [[
				[0, 217],
				[6, 123],
				[13, 56],
				[16, 46],
				[26, 27],
				[39, 14],
				[60, 3],
				[73, 0],
				[1533, 0],
				[1540, 3],
				[1545, 8],
				[1548, 14],
				[1549, 32],
				[1558, 35],
				[1570, 45],
				[1583, 32],
				[1586, 31],
				[1591, 36],
				[1592, 118],
				[1590, 129],
				[1586, 130],
				[1581, 126],
				[1580, 364],
				[1550, 395],
				[1549, 530],
				[1546, 536],
				[1541, 541],
				[1534, 544],
				[74, 544],
				[53, 538],
				[40, 530],
				[27, 517],
				[17, 498],
				[14, 488],
				[7, 421],
				[1, 327]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-gt-rlo-cl",
			"name": "230 INTRIGUE GT RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "GT styling featuring open water panels with a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-5215805fa9b060f9.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 546,
			"imageBounds": [
				0,
				0,
				1600,
				546
			],
			"imageContours": [[
				[0, 223],
				[4, 149],
				[14, 53],
				[21, 35],
				[27, 26],
				[38, 15],
				[53, 6],
				[72, 0],
				[1541, 0],
				[1548, 3],
				[1553, 9],
				[1555, 13],
				[1558, 33],
				[1565, 35],
				[1578, 45],
				[1590, 32],
				[1596, 32],
				[1598, 34],
				[1599, 44],
				[1600, 115],
				[1598, 128],
				[1596, 130],
				[1591, 129],
				[1588, 126],
				[1587, 366],
				[1558, 396],
				[1557, 528],
				[1552, 540],
				[1549, 543],
				[1542, 546],
				[73, 546],
				[53, 540],
				[39, 531],
				[28, 520],
				[22, 511],
				[15, 493],
				[5, 397],
				[1, 323]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-rlo-dl",
			"name": "230 INTRIGUE RLO - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features open water panels with a convertible rear lounge/bed and a bow starboard side couch and bow port side chairs.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-83ae68a9cf7ae180.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24' 5\"",
				"width": "8' 6\""
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 544,
			"imageBounds": [
				0,
				0,
				1594,
				544
			],
			"imageContours": [[
				[0, 214],
				[5, 134],
				[12, 63],
				[15, 47],
				[23, 30],
				[38, 14],
				[53, 5],
				[68, 0],
				[1538, 0],
				[1543, 3],
				[1549, 11],
				[1551, 32],
				[1559, 34],
				[1571, 44],
				[1573, 44],
				[1584, 32],
				[1589, 31],
				[1592, 33],
				[1593, 42],
				[1594, 117],
				[1593, 127],
				[1591, 129],
				[1588, 130],
				[1583, 126],
				[1582, 364],
				[1552, 395],
				[1551, 529],
				[1547, 538],
				[1538, 544],
				[70, 544],
				[55, 539],
				[38, 529],
				[23, 512],
				[15, 493],
				[6, 410],
				[1, 330]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-gts-rf-cl",
			"name": "230 Intrigue GTS RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with both rear and bow starboard and port couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-75745da74377e06a.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24’ 5”",
				"width": "8’ 6”"
			},
			"imageRotation": 90,
			"width": 1599,
			"height": 546,
			"imageBounds": [
				0,
				0,
				1599,
				546
			],
			"imageContours": [[
				[0, 225],
				[4, 151],
				[14, 54],
				[22, 34],
				[36, 17],
				[53, 6],
				[73, 0],
				[1539, 0],
				[1548, 4],
				[1553, 10],
				[1555, 17],
				[1556, 33],
				[1564, 35],
				[1577, 45],
				[1588, 33],
				[1595, 32],
				[1597, 34],
				[1598, 44],
				[1599, 116],
				[1597, 129],
				[1591, 130],
				[1588, 128],
				[1586, 366],
				[1557, 396],
				[1556, 529],
				[1554, 536],
				[1551, 540],
				[1546, 544],
				[1540, 546],
				[74, 546],
				[54, 540],
				[37, 529],
				[23, 512],
				[15, 492],
				[5, 395],
				[1, 321]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-gts-rl-cl",
			"name": "230 Intrigue GTS RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with rear lounge/bed and bow starboard and port couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-655ecb9b94a8da7c.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24’ 5”",
				"width": "8’ 6”"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 545,
			"imageBounds": [
				0,
				0,
				1596,
				545
			],
			"imageContours": [[
				[0, 219],
				[6, 124],
				[14, 53],
				[22, 33],
				[32, 20],
				[48, 8],
				[69, 0],
				[1538, 0],
				[1544, 3],
				[1551, 13],
				[1553, 32],
				[1559, 33],
				[1573, 44],
				[1585, 32],
				[1591, 32],
				[1594, 36],
				[1595, 43],
				[1596, 115],
				[1595, 126],
				[1592, 130],
				[1588, 130],
				[1584, 127],
				[1583, 365],
				[1575, 373],
				[1573, 400],
				[1569, 403],
				[1564, 403],
				[1554, 411],
				[1553, 528],
				[1548, 539],
				[1539, 545],
				[70, 545],
				[53, 539],
				[33, 525],
				[23, 512],
				[15, 492],
				[7, 421],
				[1, 326]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-230-intrigue-gts-rlo-cl",
			"name": "230 Intrigue GTS RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 23,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with open water panels, rear lounge/bed, and bow starboard and port couches.",
			"lengthIn": 293,
			"widthIn": 102,
			"widthOptions": [102],
			"path": "/_cdn/static/layout-premier-4fd3735f16b736a7.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "24’ 5”",
				"width": "8’ 6”"
			},
			"imageRotation": 90,
			"width": 1597,
			"height": 545,
			"imageBounds": [
				0,
				0,
				1597,
				545
			],
			"imageContours": [[
				[0, 222],
				[4, 148],
				[14, 53],
				[21, 35],
				[27, 26],
				[39, 14],
				[52, 6],
				[72, 0],
				[1538, 0],
				[1543, 2],
				[1551, 11],
				[1553, 32],
				[1562, 35],
				[1575, 45],
				[1585, 33],
				[1591, 31],
				[1595, 35],
				[1596, 44],
				[1597, 114],
				[1595, 128],
				[1593, 130],
				[1586, 128],
				[1585, 126],
				[1584, 365],
				[1554, 396],
				[1553, 531],
				[1551, 536],
				[1544, 543],
				[1538, 545],
				[73, 545],
				[53, 539],
				[39, 530],
				[28, 519],
				[22, 510],
				[15, 492],
				[5, 397],
				[1, 323]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-rf-cl",
			"name": "250 INTRIGUE RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-2cf7fb7d9a1c4f31.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1595,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1595,
				504
			],
			"imageContours": [[
				[0, 234],
				[4, 141],
				[14, 47],
				[20, 32],
				[33, 16],
				[51, 5],
				[67, 0],
				[1539, 0],
				[1547, 3],
				[1552, 9],
				[1554, 13],
				[1555, 30],
				[1564, 33],
				[1575, 42],
				[1586, 30],
				[1591, 30],
				[1593, 32],
				[1594, 40],
				[1595, 108],
				[1594, 118],
				[1592, 120],
				[1588, 120],
				[1584, 117],
				[1583, 338],
				[1556, 366],
				[1555, 491],
				[1548, 501],
				[1542, 504],
				[67, 504],
				[51, 499],
				[35, 489],
				[22, 474],
				[15, 457],
				[13, 448],
				[5, 363],
				[1, 270]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gt-rf-cl",
			"name": "250 INTRIGUE GT RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "GT styling featuring both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-5e807c6a24567187.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1600,
				505
			],
			"imageContours": [[
				[0, 203],
				[4, 134],
				[13, 48],
				[17, 36],
				[23, 26],
				[37, 12],
				[50, 5],
				[65, 0],
				[1545, 0],
				[1549, 1],
				[1556, 7],
				[1559, 14],
				[1560, 30],
				[1568, 32],
				[1580, 42],
				[1588, 32],
				[1591, 30],
				[1597, 30],
				[1599, 40],
				[1600, 108],
				[1599, 118],
				[1597, 120],
				[1591, 119],
				[1589, 116],
				[1588, 338],
				[1561, 366],
				[1560, 491],
				[1558, 497],
				[1552, 503],
				[1547, 505],
				[66, 505],
				[50, 500],
				[34, 490],
				[27, 483],
				[19, 471],
				[13, 454],
				[4, 359],
				[1, 303]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-rf-dl",
			"name": "250 INTRIGUE RF - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-2cd5732a337b33c2.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1595,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1595,
				505
			],
			"imageContours": [[
				[0, 217],
				[4, 140],
				[13, 50],
				[20, 32],
				[24, 26],
				[37, 13],
				[49, 6],
				[70, 0],
				[80, 0],
				[82, 2],
				[1528, 2],
				[1530, 0],
				[1537, 0],
				[1548, 4],
				[1552, 9],
				[1554, 13],
				[1556, 31],
				[1562, 32],
				[1575, 42],
				[1585, 31],
				[1591, 30],
				[1593, 32],
				[1594, 39],
				[1595, 109],
				[1593, 120],
				[1589, 121],
				[1584, 116],
				[1583, 338],
				[1556, 366],
				[1555, 492],
				[1549, 501],
				[1539, 505],
				[1531, 505],
				[1529, 503],
				[83, 503],
				[81, 505],
				[64, 504],
				[44, 496],
				[34, 489],
				[21, 473],
				[14, 455],
				[5, 365],
				[1, 288]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-rl-cl",
			"name": "250 INTRIGUE RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-5d71286592728471.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1593,
			"height": 503,
			"imageBounds": [
				0,
				0,
				1593,
				503
			],
			"imageContours": [[
				[0, 238],
				[4, 142],
				[14, 47],
				[20, 32],
				[33, 16],
				[51, 5],
				[66, 0],
				[1537, 0],
				[1545, 3],
				[1549, 7],
				[1552, 13],
				[1553, 30],
				[1562, 33],
				[1573, 42],
				[1581, 32],
				[1584, 30],
				[1589, 30],
				[1591, 32],
				[1592, 40],
				[1593, 108],
				[1592, 118],
				[1590, 120],
				[1584, 119],
				[1582, 116],
				[1581, 337],
				[1574, 344],
				[1572, 370],
				[1569, 372],
				[1562, 373],
				[1554, 379],
				[1553, 490],
				[1551, 495],
				[1541, 503],
				[66, 503],
				[50, 498],
				[37, 490],
				[26, 479],
				[16, 460],
				[13, 446],
				[5, 362],
				[1, 266]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gt-rl-cl",
			"name": "250 INTRIGUE GT RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "GT styling featuring a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-87ab625aa9c1d229.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1600,
				505
			],
			"imageContours": [[
				[0, 202],
				[5, 122],
				[13, 48],
				[21, 29],
				[32, 16],
				[50, 5],
				[65, 0],
				[1545, 0],
				[1549, 1],
				[1556, 7],
				[1559, 14],
				[1560, 30],
				[1568, 32],
				[1580, 42],
				[1590, 30],
				[1597, 30],
				[1599, 39],
				[1600, 108],
				[1599, 118],
				[1597, 120],
				[1591, 119],
				[1589, 116],
				[1588, 338],
				[1581, 346],
				[1580, 370],
				[1577, 373],
				[1571, 373],
				[1561, 381],
				[1560, 491],
				[1558, 497],
				[1548, 505],
				[66, 505],
				[50, 500],
				[34, 490],
				[20, 473],
				[13, 454],
				[5, 372],
				[1, 303]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-rl-dl",
			"name": "250 INTRIGUE RL - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-44cc6f6fdc4d2f6e.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1590,
			"height": 503,
			"imageBounds": [
				0,
				0,
				1590,
				503
			],
			"imageContours": [[
				[0, 210],
				[4, 136],
				[11, 62],
				[12, 53],
				[17, 37],
				[23, 27],
				[37, 13],
				[49, 6],
				[71, 0],
				[80, 0],
				[82, 2],
				[1522, 2],
				[1524, 0],
				[1531, 0],
				[1542, 4],
				[1547, 10],
				[1550, 31],
				[1558, 33],
				[1570, 42],
				[1579, 31],
				[1585, 30],
				[1587, 32],
				[1589, 44],
				[1590, 103],
				[1588, 119],
				[1584, 121],
				[1579, 118],
				[1578, 337],
				[1570, 345],
				[1569, 369],
				[1565, 372],
				[1560, 372],
				[1551, 379],
				[1550, 488],
				[1547, 495],
				[1541, 501],
				[1536, 503],
				[1524, 503],
				[1523, 501],
				[83, 501],
				[81, 503],
				[68, 503],
				[51, 498],
				[37, 490],
				[25, 478],
				[16, 461],
				[13, 450],
				[5, 367],
				[1, 294]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-rlo-cl",
			"name": "250 INTRIGUE RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features open water panels with a convertible rear lounge/bed and bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-c629821f715c0d2b.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1599,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1599,
				506
			],
			"imageContours": [[
				[0, 239],
				[4, 143],
				[14, 48],
				[21, 31],
				[36, 14],
				[49, 6],
				[68, 0],
				[81, 0],
				[83, 2],
				[1533, 2],
				[1535, 0],
				[1544, 0],
				[1552, 3],
				[1558, 9],
				[1560, 15],
				[1561, 30],
				[1569, 33],
				[1580, 42],
				[1590, 31],
				[1598, 31],
				[1599, 120],
				[1594, 121],
				[1590, 118],
				[1589, 339],
				[1562, 367],
				[1561, 492],
				[1557, 500],
				[1548, 506],
				[68, 506],
				[51, 501],
				[34, 490],
				[21, 474],
				[14, 455],
				[4, 349],
				[1, 267]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gt-rlo-cl",
			"name": "250 INTRIGUE GT RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "GT styling featuring open water panels with a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-3898b52164c0ae2b.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1599,
			"height": 505,
			"imageBounds": [
				0,
				0,
				1599,
				505
			],
			"imageContours": [[
				[0, 203],
				[4, 134],
				[13, 48],
				[21, 29],
				[32, 16],
				[50, 5],
				[65, 0],
				[1545, 0],
				[1550, 2],
				[1557, 10],
				[1559, 30],
				[1565, 31],
				[1579, 41],
				[1589, 30],
				[1594, 29],
				[1597, 32],
				[1598, 39],
				[1599, 108],
				[1598, 118],
				[1596, 120],
				[1590, 119],
				[1588, 116],
				[1587, 338],
				[1560, 366],
				[1559, 492],
				[1557, 497],
				[1547, 505],
				[66, 505],
				[50, 500],
				[34, 490],
				[27, 483],
				[19, 471],
				[13, 454],
				[4, 359],
				[1, 303]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-rlo-dl",
			"name": "250 INTRIGUE RLO - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features open water panels with a convertible rear lounge/bed and a bow starboard side couch and bow port side chairs.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-23163e253c5358f7.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1593,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1593,
				504
			],
			"imageContours": [[
				[0, 215],
				[2, 167],
				[7, 106],
				[12, 55],
				[17, 38],
				[25, 25],
				[39, 12],
				[60, 2],
				[72, 0],
				[80, 0],
				[82, 2],
				[1526, 2],
				[1528, 0],
				[1535, 0],
				[1544, 3],
				[1550, 9],
				[1552, 13],
				[1553, 31],
				[1561, 33],
				[1573, 42],
				[1583, 31],
				[1588, 30],
				[1591, 32],
				[1592, 40],
				[1593, 108],
				[1591, 120],
				[1587, 121],
				[1582, 117],
				[1581, 338],
				[1554, 366],
				[1553, 492],
				[1545, 502],
				[1541, 504],
				[66, 504],
				[50, 499],
				[37, 491],
				[21, 473],
				[14, 455],
				[5, 366],
				[1, 290]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gts-rf-cl",
			"name": "250 Intrigue GTS RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with both rear and bow starboard and port couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-61e64f270c7443a4.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26’ 5”",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1596,
				504
			],
			"imageContours": [[
				[0, 192],
				[3, 141],
				[11, 56],
				[13, 47],
				[20, 30],
				[34, 14],
				[49, 5],
				[63, 0],
				[1542, 0],
				[1547, 2],
				[1553, 8],
				[1555, 12],
				[1557, 30],
				[1563, 31],
				[1575, 41],
				[1577, 41],
				[1586, 30],
				[1591, 29],
				[1594, 31],
				[1595, 38],
				[1596, 109],
				[1595, 118],
				[1593, 120],
				[1590, 120],
				[1586, 117],
				[1585, 337],
				[1558, 365],
				[1557, 485],
				[1556, 492],
				[1553, 498],
				[1544, 504],
				[64, 504],
				[49, 499],
				[36, 491],
				[25, 480],
				[18, 469],
				[15, 461],
				[12, 448],
				[7, 396],
				[1, 312]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gts-rf-cl-with-port-gate",
			"name": "250 Intrigue GTS RF - CL with Port Gate",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with both rear and bow starboard and port couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-15dc372460b26dad.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26’ 5”",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1594,
				504
			],
			"imageContours": [[
				[0, 218],
				[4, 138],
				[12, 54],
				[14, 45],
				[24, 25],
				[35, 14],
				[48, 6],
				[66, 0],
				[81, 0],
				[82, 2],
				[1526, 2],
				[1527, 0],
				[1539, 0],
				[1547, 4],
				[1551, 9],
				[1554, 30],
				[1561, 32],
				[1572, 41],
				[1574, 41],
				[1583, 31],
				[1588, 29],
				[1592, 32],
				[1593, 42],
				[1594, 104],
				[1592, 119],
				[1586, 120],
				[1583, 117],
				[1582, 338],
				[1555, 365],
				[1554, 488],
				[1550, 498],
				[1540, 504],
				[67, 504],
				[49, 498],
				[36, 490],
				[25, 479],
				[15, 459],
				[13, 450],
				[5, 366],
				[1, 286]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gts-rl-cl",
			"name": "250 Intrigue GTS RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with rear lounge/bed and bow starboard and port couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-cd3a98189b679a28.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26’ 5”",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1594,
				504
			],
			"imageContours": [[
				[0, 202],
				[4, 133],
				[13, 48],
				[20, 31],
				[36, 13],
				[50, 5],
				[64, 0],
				[1539, 0],
				[1547, 4],
				[1551, 9],
				[1553, 15],
				[1554, 30],
				[1563, 33],
				[1572, 41],
				[1574, 41],
				[1584, 30],
				[1590, 30],
				[1592, 32],
				[1593, 40],
				[1594, 108],
				[1593, 117],
				[1591, 120],
				[1586, 120],
				[1583, 117],
				[1582, 338],
				[1575, 345],
				[1573, 370],
				[1569, 373],
				[1564, 373],
				[1555, 380],
				[1554, 489],
				[1550, 498],
				[1542, 504],
				[65, 504],
				[46, 497],
				[33, 488],
				[24, 478],
				[18, 468],
				[13, 453],
				[5, 371],
				[1, 302]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gts-rl-cl-with-port-gate",
			"name": "250 Intrigue GTS RL - CL with Port Gate",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with rear lounge/bed and bow starboard and port couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-4ce927ca106f9caa.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26’ 5”",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1594,
				504
			],
			"imageContours": [[
				[0, 194],
				[3, 143],
				[11, 57],
				[16, 38],
				[27, 21],
				[37, 12],
				[47, 6],
				[65, 0],
				[1539, 0],
				[1543, 1],
				[1551, 8],
				[1554, 18],
				[1555, 30],
				[1562, 32],
				[1574, 42],
				[1585, 30],
				[1591, 30],
				[1593, 39],
				[1594, 109],
				[1593, 118],
				[1591, 120],
				[1587, 120],
				[1584, 118],
				[1583, 337],
				[1575, 345],
				[1573, 371],
				[1569, 373],
				[1566, 372],
				[1556, 379],
				[1555, 486],
				[1552, 496],
				[1542, 504],
				[66, 504],
				[50, 499],
				[39, 493],
				[26, 481],
				[17, 466],
				[12, 448],
				[4, 361],
				[1, 310]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gts-rlo-cl",
			"name": "250 Intrigue GTS RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with open water panels, rear lounge/bed, and bow starboard and port couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-bb7e2afa41040592.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26’ 5”",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1596,
				504
			],
			"imageContours": [[
				[0, 204],
				[4, 134],
				[13, 48],
				[17, 36],
				[23, 26],
				[32, 16],
				[45, 7],
				[64, 0],
				[1542, 0],
				[1547, 2],
				[1554, 10],
				[1556, 30],
				[1564, 32],
				[1576, 41],
				[1586, 30],
				[1591, 29],
				[1594, 32],
				[1595, 40],
				[1596, 108],
				[1595, 118],
				[1593, 120],
				[1587, 119],
				[1585, 116],
				[1584, 338],
				[1557, 366],
				[1556, 492],
				[1548, 502],
				[1544, 504],
				[65, 504],
				[50, 499],
				[34, 489],
				[24, 478],
				[19, 470],
				[13, 453],
				[4, 358],
				[1, 301]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-250-intrigue-gts-rlo-cl-with-port-gate",
			"name": "250 Intrigue GTS RLO - CL with Port Gate",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 25,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with open water panels, rear lounge/bed, and bow starboard and port couches.",
			"lengthIn": 317,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-ed5468180d7b6655.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "26’ 5”",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1594,
				504
			],
			"imageContours": [[
				[0, 206],
				[7, 102],
				[12, 52],
				[15, 42],
				[22, 28],
				[35, 14],
				[50, 5],
				[65, 0],
				[1539, 0],
				[1546, 3],
				[1550, 7],
				[1553, 13],
				[1554, 30],
				[1563, 33],
				[1574, 41],
				[1584, 30],
				[1588, 29],
				[1592, 32],
				[1593, 40],
				[1594, 107],
				[1593, 117],
				[1591, 120],
				[1587, 120],
				[1583, 117],
				[1582, 338],
				[1555, 365],
				[1554, 491],
				[1547, 501],
				[1541, 504],
				[66, 504],
				[51, 499],
				[37, 491],
				[25, 479],
				[15, 459],
				[12, 443],
				[5, 368],
				[1, 298]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-rf-cl",
			"name": "270 INTRIGUE RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-82a2a22720d50492.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 468,
			"imageBounds": [
				0,
				0,
				1596,
				468
			],
			"imageContours": [[
				[0, 195],
				[3, 136],
				[11, 52],
				[13, 43],
				[20, 27],
				[30, 15],
				[43, 6],
				[60, 0],
				[1546, 0],
				[1550, 2],
				[1556, 9],
				[1558, 28],
				[1564, 29],
				[1577, 38],
				[1587, 27],
				[1591, 27],
				[1593, 29],
				[1595, 39],
				[1596, 95],
				[1594, 110],
				[1592, 112],
				[1589, 112],
				[1585, 109],
				[1584, 314],
				[1560, 339],
				[1559, 449],
				[1556, 461],
				[1548, 468],
				[59, 468],
				[47, 464],
				[34, 456],
				[22, 443],
				[15, 429],
				[12, 416],
				[5, 344],
				[1, 273]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gt-rf-cl",
			"name": "270 INTRIGUE GT RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "GT styling featuring both rear and bow facing couches on the starboard and port sides.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-2e521b55166d60df.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1600,
				470
			],
			"imageContours": [[
				[0, 183],
				[3, 131],
				[12, 45],
				[19, 28],
				[31, 14],
				[45, 5],
				[61, 0],
				[1549, 0],
				[1554, 2],
				[1560, 8],
				[1563, 28],
				[1570, 30],
				[1581, 38],
				[1591, 28],
				[1595, 27],
				[1598, 29],
				[1599, 38],
				[1600, 101],
				[1599, 110],
				[1597, 112],
				[1593, 112],
				[1590, 110],
				[1589, 315],
				[1564, 341],
				[1563, 455],
				[1561, 462],
				[1554, 469],
				[1551, 470],
				[61, 470],
				[48, 466],
				[34, 458],
				[21, 444],
				[15, 432],
				[12, 422],
				[7, 373],
				[1, 287]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-rf-dl",
			"name": "270 INTRIGUE RF - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features rear facing couches, bow starboard side couch, and bow port side chairs.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-5c259bec9b74b500.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 468,
			"imageBounds": [
				0,
				0,
				1596,
				468
			],
			"imageContours": [[
				[0, 195],
				[6, 103],
				[11, 53],
				[14, 40],
				[19, 29],
				[30, 15],
				[45, 5],
				[60, 0],
				[1545, 0],
				[1551, 3],
				[1556, 9],
				[1558, 28],
				[1564, 29],
				[1577, 38],
				[1587, 27],
				[1591, 27],
				[1593, 29],
				[1595, 39],
				[1596, 96],
				[1594, 110],
				[1592, 112],
				[1589, 112],
				[1585, 109],
				[1584, 314],
				[1559, 340],
				[1558, 456],
				[1556, 461],
				[1548, 468],
				[59, 468],
				[40, 460],
				[25, 447],
				[18, 436],
				[13, 422],
				[4, 331],
				[1, 274]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-rl-cl",
			"name": "270 INTRIGUE RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Offers a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-431fbc3d408c6852.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1590,
			"height": 466,
			"imageBounds": [
				0,
				0,
				1590,
				466
			],
			"imageContours": [[
				[0, 194],
				[3, 137],
				[11, 52],
				[13, 43],
				[20, 27],
				[31, 14],
				[45, 5],
				[60, 0],
				[1540, 0],
				[1544, 2],
				[1550, 9],
				[1553, 28],
				[1560, 30],
				[1570, 38],
				[1578, 29],
				[1581, 27],
				[1585, 27],
				[1587, 29],
				[1589, 39],
				[1590, 96],
				[1588, 110],
				[1584, 112],
				[1579, 108],
				[1578, 313],
				[1571, 320],
				[1570, 342],
				[1567, 345],
				[1562, 345],
				[1554, 351],
				[1553, 447],
				[1550, 459],
				[1546, 464],
				[1542, 466],
				[58, 466],
				[41, 459],
				[25, 445],
				[17, 432],
				[13, 420],
				[4, 329],
				[1, 273]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gt-rl-cl",
			"name": "270 INTRIGUE GT RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "GT styling featuring a convertible rear lounge/bed with bow starboard and port side couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-cdc1d5f2f0f5133b.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1600,
				470
			],
			"imageContours": [[
				[0, 183],
				[3, 131],
				[12, 45],
				[19, 28],
				[31, 14],
				[45, 5],
				[61, 0],
				[1549, 0],
				[1554, 2],
				[1560, 8],
				[1563, 28],
				[1570, 30],
				[1581, 38],
				[1591, 28],
				[1595, 27],
				[1598, 29],
				[1599, 38],
				[1600, 101],
				[1599, 110],
				[1597, 112],
				[1593, 112],
				[1590, 110],
				[1589, 315],
				[1582, 322],
				[1581, 344],
				[1576, 348],
				[1572, 348],
				[1564, 354],
				[1563, 455],
				[1561, 462],
				[1554, 469],
				[1551, 470],
				[61, 470],
				[48, 466],
				[34, 458],
				[21, 444],
				[12, 422],
				[4, 339],
				[1, 287]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-rl-dl",
			"name": "270 INTRIGUE RL - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Offers a convertible rear lounge/bed with bow starboard side couch and bow port side chairs.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-5c259bec9b74b500.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 468,
			"imageBounds": [
				0,
				0,
				1596,
				468
			],
			"imageContours": [[
				[0, 195],
				[6, 103],
				[11, 53],
				[14, 40],
				[19, 29],
				[30, 15],
				[45, 5],
				[60, 0],
				[1545, 0],
				[1551, 3],
				[1556, 9],
				[1558, 28],
				[1564, 29],
				[1577, 38],
				[1587, 27],
				[1591, 27],
				[1593, 29],
				[1595, 39],
				[1596, 96],
				[1594, 110],
				[1592, 112],
				[1589, 112],
				[1585, 109],
				[1584, 314],
				[1559, 340],
				[1558, 456],
				[1556, 461],
				[1548, 468],
				[59, 468],
				[40, 460],
				[25, 447],
				[18, 436],
				[13, 422],
				[4, 331],
				[1, 274]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-rlo-cl",
			"name": "270 INTRIGUE RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features open water panels with bow starboard and port side couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-c629821f715c0d2b.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1599,
			"height": 506,
			"imageBounds": [
				0,
				0,
				1599,
				506
			],
			"imageContours": [[
				[0, 239],
				[4, 143],
				[14, 48],
				[21, 31],
				[36, 14],
				[49, 6],
				[68, 0],
				[81, 0],
				[83, 2],
				[1533, 2],
				[1535, 0],
				[1544, 0],
				[1552, 3],
				[1558, 9],
				[1560, 15],
				[1561, 30],
				[1569, 33],
				[1580, 42],
				[1590, 31],
				[1598, 31],
				[1599, 120],
				[1594, 121],
				[1590, 118],
				[1589, 339],
				[1562, 367],
				[1561, 492],
				[1557, 500],
				[1548, 506],
				[68, 506],
				[51, 501],
				[34, 490],
				[21, 474],
				[14, 455],
				[4, 349],
				[1, 267]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gt-rlo-cl",
			"name": "270 INTRIGUE GT RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "GT styling featuring open water panels with bow starboard and port side couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-f950974464f48920.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1599,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1599,
				470
			],
			"imageContours": [[
				[0, 183],
				[3, 131],
				[12, 45],
				[19, 28],
				[31, 14],
				[45, 5],
				[61, 0],
				[1549, 0],
				[1555, 3],
				[1560, 10],
				[1562, 28],
				[1569, 30],
				[1580, 38],
				[1589, 28],
				[1594, 27],
				[1597, 29],
				[1598, 38],
				[1599, 101],
				[1598, 110],
				[1596, 112],
				[1592, 112],
				[1589, 109],
				[1588, 315],
				[1563, 341],
				[1562, 456],
				[1559, 464],
				[1551, 470],
				[61, 470],
				[48, 466],
				[30, 455],
				[20, 443],
				[14, 430],
				[11, 414],
				[7, 373],
				[1, 287]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-rlo-dl",
			"name": "270 INTRIGUE RLO - DL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features open water panels with a convertible rear lounge/bed and a bow starboard side couch and bow port side chairs.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-04fbbf63b8a356bb.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1593,
			"height": 504,
			"imageBounds": [
				0,
				0,
				1593,
				504
			],
			"imageContours": [[
				[0, 215],
				[2, 167],
				[7, 106],
				[12, 55],
				[17, 38],
				[25, 25],
				[39, 12],
				[60, 2],
				[72, 0],
				[80, 0],
				[82, 2],
				[1526, 2],
				[1528, 0],
				[1535, 0],
				[1544, 3],
				[1550, 9],
				[1552, 13],
				[1553, 31],
				[1561, 33],
				[1573, 42],
				[1583, 31],
				[1588, 30],
				[1591, 32],
				[1592, 40],
				[1593, 108],
				[1591, 120],
				[1587, 121],
				[1582, 117],
				[1581, 338],
				[1554, 366],
				[1553, 492],
				[1545, 502],
				[1541, 504],
				[66, 504],
				[50, 499],
				[37, 491],
				[21, 473],
				[14, 455],
				[5, 366],
				[1, 290]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gts-rf-cl",
			"name": "270 Intrigue GTS RF - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with both rear and bow starboard and port couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-4affdc5def340a4a.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1598,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1598,
				470
			],
			"imageContours": [[
				[0, 178],
				[10, 55],
				[14, 38],
				[21, 25],
				[32, 13],
				[45, 5],
				[61, 0],
				[1548, 0],
				[1558, 8],
				[1561, 28],
				[1568, 30],
				[1578, 38],
				[1580, 38],
				[1589, 28],
				[1593, 27],
				[1596, 29],
				[1597, 37],
				[1598, 101],
				[1596, 112],
				[1593, 113],
				[1588, 110],
				[1587, 315],
				[1562, 341],
				[1561, 456],
				[1557, 465],
				[1549, 470],
				[1544, 470],
				[1543, 454],
				[1541, 454],
				[1540, 470],
				[60, 470],
				[48, 466],
				[34, 458],
				[21, 444],
				[13, 426],
				[6, 364],
				[1, 293]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gts-rf-cl-with-port-gate",
			"name": "270 Intrigue GTS RF - CL with Port Gate",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with both rear and bow starboard and port couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-4d35fd63822d37ff.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1594,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1594,
				470
			],
			"imageContours": [[
				[0, 172],
				[10, 53],
				[14, 38],
				[19, 28],
				[30, 15],
				[46, 5],
				[61, 0],
				[75, 0],
				[76, 2],
				[1531, 2],
				[1532, 0],
				[1544, 0],
				[1555, 9],
				[1558, 28],
				[1564, 30],
				[1575, 39],
				[1586, 28],
				[1591, 28],
				[1593, 30],
				[1594, 110],
				[1591, 113],
				[1585, 111],
				[1584, 315],
				[1559, 341],
				[1558, 455],
				[1555, 463],
				[1546, 470],
				[75, 469],
				[73, 456],
				[71, 456],
				[70, 469],
				[59, 470],
				[42, 463],
				[33, 457],
				[21, 444],
				[14, 430],
				[11, 417],
				[6, 367],
				[1, 298]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gts-rl-cl",
			"name": "270 Intrigue GTS RL - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with rear lounge/bed and bow starboard and port couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-7e84dcdd4305ec29.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1598,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1598,
				470
			],
			"imageContours": [[
				[0, 180],
				[6, 96],
				[10, 55],
				[13, 41],
				[21, 25],
				[32, 13],
				[45, 5],
				[60, 0],
				[1548, 0],
				[1558, 8],
				[1561, 28],
				[1568, 30],
				[1579, 38],
				[1587, 29],
				[1593, 27],
				[1596, 29],
				[1597, 37],
				[1598, 101],
				[1597, 110],
				[1595, 112],
				[1593, 113],
				[1588, 110],
				[1587, 315],
				[1580, 322],
				[1579, 344],
				[1574, 348],
				[1570, 348],
				[1562, 354],
				[1561, 456],
				[1559, 462],
				[1549, 470],
				[61, 470],
				[48, 466],
				[33, 457],
				[22, 445],
				[14, 429],
				[11, 415],
				[7, 374],
				[1, 290]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gts-rl-cl-with-port-gate",
			"name": "270 Intrigue GTS RL - CL with Port Gate",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with rear lounge/bed and bow starboard and port couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-15da373c9daa1b30.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 470,
			"imageBounds": [
				0,
				0,
				1600,
				470
			],
			"imageContours": [[
				[0, 180],
				[6, 96],
				[11, 48],
				[13, 41],
				[21, 25],
				[33, 12],
				[47, 4],
				[59, 0],
				[1551, 0],
				[1555, 2],
				[1561, 9],
				[1564, 28],
				[1569, 29],
				[1581, 38],
				[1593, 27],
				[1596, 27],
				[1599, 30],
				[1600, 109],
				[1598, 112],
				[1594, 112],
				[1591, 110],
				[1590, 314],
				[1582, 323],
				[1581, 345],
				[1577, 348],
				[1571, 349],
				[1564, 355],
				[1563, 458],
				[1561, 463],
				[1553, 470],
				[59, 470],
				[41, 463],
				[29, 454],
				[18, 439],
				[12, 423],
				[4, 340],
				[1, 290]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gts-rlo-cl",
			"name": "270 Intrigue GTS RLO - CL",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with open water panels, rear lounge/bed, and bow starboard and port couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-744ced0356bcf1e0.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1600,
			"height": 472,
			"imageBounds": [
				0,
				0,
				1600,
				472
			],
			"imageContours": [[
				[0, 151],
				[9, 52],
				[12, 40],
				[19, 26],
				[31, 13],
				[44, 5],
				[60, 0],
				[1551, 0],
				[1557, 3],
				[1562, 9],
				[1565, 28],
				[1571, 30],
				[1582, 39],
				[1591, 29],
				[1595, 27],
				[1599, 29],
				[1600, 112],
				[1595, 113],
				[1592, 111],
				[1591, 316],
				[1566, 341],
				[1565, 455],
				[1562, 465],
				[1553, 472],
				[60, 472],
				[47, 468],
				[30, 458],
				[20, 447],
				[14, 436],
				[10, 421],
				[1, 321]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-270-intrigue-gts-rlo-cl-with-port-gate",
			"name": "270 Intrigue GTS RLO - CL with Port Gate",
			"family": "Intrigue",
			"familyKey": "intrigue",
			"nominalLengthFt": 27,
			"description": "Features dual fiberglass helms with full wraparound windshield coupled with open water panels, rear lounge/bed, and bow starboard and port couches.",
			"lengthIn": 341,
			"widthIn": 102,
			"widthOptions": [102, 120],
			"path": "/_cdn/static/layout-premier-2abf45b966269ca3.webp",
			"sourcePage": "https://www.pontoons.com/models/intrigue/",
			"sourceDimensions": {
				"length": "28' 5\"",
				"width": "8' 6\"- 10'"
			},
			"imageRotation": 90,
			"width": 1596,
			"height": 468,
			"imageBounds": [
				0,
				0,
				1596,
				468
			],
			"imageContours": [[
				[0, 176],
				[5, 105],
				[10, 54],
				[13, 40],
				[19, 27],
				[31, 13],
				[41, 6],
				[56, 0],
				[1548, 0],
				[1557, 9],
				[1559, 27],
				[1566, 29],
				[1577, 37],
				[1586, 27],
				[1591, 26],
				[1594, 29],
				[1595, 37],
				[1596, 100],
				[1595, 109],
				[1593, 111],
				[1591, 112],
				[1586, 109],
				[1585, 314],
				[1560, 339],
				[1559, 456],
				[1557, 461],
				[1549, 468],
				[58, 468],
				[46, 464],
				[33, 456],
				[19, 440],
				[13, 426],
				[6, 363],
				[1, 292]
			]],
			"dimensionMode": "published"
		},
		{
			"id": "premier-330-escalante",
			"name": "330 ESCALANTE",
			"family": "Escalante",
			"familyKey": "escalante",
			"nominalLengthFt": 33,
			"description": "Features rear entry with an L-shaped rear couch and bow starboard and port side couches. Upper Level features couches and water slide.",
			"lengthIn": 413,
			"widthIn": 120,
			"widthOptions": [120],
			"path": "/_cdn/static/layout-premier-e200ab18cb4978a1.webp",
			"sourcePage": "https://www.pontoons.com/models/escalante/",
			"sourceDimensions": {
				"length": "34' 5\"",
				"width": "10'"
			},
			"imageRotation": 90,
			"width": 1346,
			"height": 394,
			"imageBounds": [
				0,
				0,
				1346,
				394
			],
			"imageContours": [[
				[0, 152],
				[8, 33],
				[17, 15],
				[31, 4],
				[40, 1],
				[498, 0],
				[501, 2],
				[503, 0],
				[507, 393],
				[509, 299],
				[510, 0],
				[1138, 0],
				[1139, 151],
				[1144, 156],
				[1145, 0],
				[1306, 1],
				[1310, 11],
				[1314, 33],
				[1315, 90],
				[1345, 131],
				[1346, 263],
				[1335, 278],
				[1333, 379],
				[1329, 380],
				[1321, 369],
				[1313, 376],
				[1307, 393],
				[1068, 394],
				[1067, 158],
				[1065, 156],
				[1064, 394],
				[1059, 390],
				[513, 390],
				[509, 394],
				[503, 394],
				[502, 392],
				[500, 394],
				[45, 394],
				[34, 391],
				[24, 385],
				[13, 372],
				[9, 361],
				[1, 243]
			]],
			"drawingNote": "Placed image shows the lower deck. The manufacturer page also shows the upper deck.",
			"dimensionMode": "published"
		}
	];
	const premierModel = (id) => PREMIER_MODELS.find((model) => model.id === id);

// layout-migration-source/client/evotti-catalog.js
	const EVOTTI_MODELS = [
		{
			"id": "evotti-4551",
			"sourceId": "4551",
			"name": "521CL 2027",
			"model": "521CL",
			"year": "2027",
			"series": "500",
			"floorplan": "Convertible Lounge (CL)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "156540",
			"path": "/_cdn/static/layout-evotti-156540.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				292,
				117,
				3940,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2462, 116],
				[2814, 118],
				[2814, 132],
				[2892, 134],
				[3066, 134],
				[3076, 122],
				[3088, 118],
				[3706, 120],
				[3770, 128],
				[3822, 144],
				[3844, 156],
				[3926, 168],
				[4006, 186],
				[4012, 190],
				[4036, 194],
				[4048, 200],
				[4056, 200],
				[4068, 206],
				[4100, 214],
				[4130, 230],
				[4166, 266],
				[4168, 274],
				[4172, 276],
				[4180, 292],
				[4188, 320],
				[4216, 472],
				[4226, 558],
				[4232, 648],
				[4232, 804],
				[4222, 934],
				[4196, 1096],
				[4192, 1104],
				[4184, 1148],
				[4170, 1180],
				[4160, 1190],
				[4160, 1194],
				[4124, 1226],
				[4100, 1238],
				[4064, 1250],
				[4056, 1250],
				[4022, 1262],
				[3972, 1272],
				[3956, 1278],
				[3846, 1296],
				[3832, 1304],
				[3784, 1320],
				[3712, 1330],
				[2868, 1334],
				[1628, 1330],
				[996, 1328],
				[992, 1308],
				[896, 1304],
				[880, 1300],
				[830, 1296],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1280],
				[744, 1262],
				[710, 1258],
				[698, 1246],
				[698, 1234],
				[704, 1232],
				[704, 1228],
				[680, 1228],
				[654, 1204],
				[654, 1026],
				[692, 1024],
				[700, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1002],
				[708, 998],
				[750, 998],
				[752, 926],
				[824, 904],
				[828, 882],
				[838, 880],
				[838, 854],
				[822, 838],
				[822, 810],
				[820, 818],
				[816, 818],
				[816, 836],
				[812, 840],
				[802, 844],
				[750, 842],
				[750, 848],
				[746, 852],
				[678, 850],
				[612, 864],
				[554, 870],
				[484, 870],
				[420, 864],
				[398, 858],
				[382, 848],
				[370, 846],
				[352, 836],
				[330, 814],
				[330, 810],
				[310, 788],
				[308, 780],
				[304, 778],
				[298, 766],
				[292, 742],
				[292, 712],
				[298, 686],
				[308, 668],
				[312, 666],
				[312, 662],
				[316, 660],
				[316, 656],
				[330, 642],
				[330, 638],
				[358, 612],
				[382, 604],
				[404, 592],
				[456, 584],
				[550, 582],
				[596, 586],
				[686, 604],
				[730, 618],
				[734, 622],
				[740, 622],
				[740, 616],
				[754, 608],
				[800, 608],
				[816, 616],
				[816, 634],
				[820, 634],
				[822, 642],
				[822, 614],
				[838, 598],
				[838, 572],
				[828, 570],
				[824, 548],
				[756, 528],
				[750, 522],
				[750, 216],
				[744, 214],
				[744, 172],
				[754, 166],
				[786, 160],
				[806, 162],
				[818, 158],
				[900, 148],
				[992, 144],
				[996, 124],
				[1492, 124],
				[1542, 120]
			]],
			"legacyLengthIn": [330.49342105263156],
			"layoutLengthIn": 307,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 25 ft 7 in, including motor."
		},
		{
			"id": "evotti-4549",
			"sourceId": "4549",
			"name": "521CS 2027",
			"model": "521CS",
			"year": "2027",
			"series": "500",
			"floorplan": "Convertible Stern (CS)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "145313",
			"path": "/_cdn/static/layout-evotti-145313.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				293,
				119,
				3939,
				1214
			],
			"imageRotation": -90,
			"imageContours": [[
				[2282, 118],
				[2800, 118],
				[2814, 120],
				[2814, 146],
				[3054, 144],
				[3056, 140],
				[3072, 132],
				[3082, 120],
				[3710, 122],
				[3762, 128],
				[3814, 142],
				[3818, 146],
				[3830, 148],
				[3850, 158],
				[3912, 166],
				[4026, 192],
				[4032, 196],
				[4040, 196],
				[4046, 200],
				[4054, 200],
				[4098, 214],
				[4126, 228],
				[4158, 256],
				[4158, 260],
				[4172, 276],
				[4184, 304],
				[4214, 458],
				[4230, 610],
				[4232, 802],
				[4228, 872],
				[4208, 1032],
				[4182, 1154],
				[4160, 1194],
				[4132, 1220],
				[4098, 1238],
				[3970, 1274],
				[3878, 1292],
				[3850, 1294],
				[3802, 1314],
				[3736, 1328],
				[2858, 1334],
				[1872, 1332],
				[1524, 1330],
				[1262, 1312],
				[1236, 1308],
				[962, 1308],
				[870, 1300],
				[812, 1290],
				[792, 1292],
				[756, 1286],
				[754, 1282],
				[746, 1280],
				[746, 1260],
				[722, 1260],
				[710, 1256],
				[698, 1244],
				[698, 1230],
				[680, 1228],
				[656, 1204],
				[656, 1026],
				[678, 1022],
				[700, 1026],
				[708, 1022],
				[702, 1014],
				[698, 1014],
				[700, 1002],
				[718, 998],
				[752, 998],
				[754, 926],
				[824, 906],
				[830, 882],
				[838, 880],
				[836, 848],
				[822, 834],
				[816, 832],
				[810, 840],
				[804, 842],
				[750, 842],
				[746, 852],
				[670, 850],
				[630, 860],
				[572, 868],
				[462, 868],
				[408, 860],
				[354, 836],
				[348, 828],
				[344, 828],
				[338, 822],
				[338, 818],
				[328, 810],
				[328, 806],
				[306, 780],
				[296, 758],
				[292, 734],
				[292, 718],
				[298, 688],
				[304, 676],
				[308, 674],
				[310, 666],
				[328, 646],
				[328, 642],
				[360, 612],
				[380, 606],
				[408, 592],
				[466, 584],
				[532, 582],
				[604, 588],
				[690, 606],
				[702, 612],
				[722, 616],
				[732, 622],
				[740, 622],
				[740, 618],
				[746, 612],
				[762, 608],
				[804, 610],
				[816, 618],
				[814, 634],
				[818, 636],
				[818, 642],
				[824, 642],
				[824, 614],
				[838, 602],
				[838, 570],
				[830, 570],
				[824, 546],
				[798, 540],
				[780, 532],
				[772, 532],
				[754, 526],
				[752, 522],
				[752, 216],
				[746, 214],
				[746, 172],
				[756, 166],
				[792, 160],
				[812, 162],
				[824, 158],
				[888, 150],
				[968, 144],
				[1236, 144],
				[1372, 132],
				[1538, 122]
			]],
			"legacyLengthIn": [330.9538714991763],
			"layoutLengthIn": 307,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 25 ft 7 in, including motor."
		},
		{
			"id": "evotti-139",
			"sourceId": "139",
			"name": "521FL 2027",
			"model": "521FL",
			"year": "2027",
			"series": "500",
			"floorplan": "Fish Lounge (FL)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "156542",
			"path": "/_cdn/static/layout-evotti-156542.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				292,
				118,
				3941,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2050, 118],
				[2802, 118],
				[2816, 120],
				[2816, 132],
				[2894, 134],
				[3066, 134],
				[3080, 120],
				[3096, 118],
				[3724, 122],
				[3784, 132],
				[3790, 136],
				[3822, 144],
				[3846, 156],
				[3956, 174],
				[3964, 178],
				[3974, 178],
				[4022, 190],
				[4082, 210],
				[4090, 210],
				[4136, 234],
				[4156, 252],
				[4156, 256],
				[4172, 274],
				[4186, 308],
				[4192, 344],
				[4196, 352],
				[4222, 510],
				[4232, 626],
				[4234, 780],
				[4222, 942],
				[4208, 1038],
				[4190, 1128],
				[4180, 1162],
				[4172, 1178],
				[4156, 1196],
				[4156, 1200],
				[4134, 1220],
				[4096, 1240],
				[4076, 1244],
				[4044, 1256],
				[4036, 1256],
				[4030, 1260],
				[3928, 1284],
				[3846, 1296],
				[3838, 1302],
				[3792, 1318],
				[3726, 1330],
				[2706, 1334],
				[1994, 1334],
				[1632, 1332],
				[1506, 1328],
				[840, 1328],
				[832, 1294],
				[818, 1294],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1276],
				[744, 1262],
				[716, 1260],
				[700, 1248],
				[698, 1236],
				[706, 1232],
				[704, 1228],
				[680, 1228],
				[670, 1216],
				[666, 1216],
				[656, 1206],
				[656, 1024],
				[692, 1024],
				[696, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1004],
				[708, 998],
				[752, 998],
				[752, 926],
				[822, 906],
				[826, 900],
				[828, 882],
				[838, 880],
				[838, 852],
				[826, 842],
				[826, 610],
				[834, 606],
				[838, 600],
				[838, 572],
				[828, 570],
				[826, 552],
				[822, 546],
				[752, 526],
				[752, 216],
				[744, 214],
				[744, 174],
				[748, 170],
				[752, 170],
				[754, 166],
				[788, 160],
				[808, 162],
				[832, 158],
				[840, 124],
				[1512, 124],
				[1666, 120]
			], [
				[502, 582],
				[578, 584],
				[634, 592],
				[700, 608],
				[730, 618],
				[734, 622],
				[740, 622],
				[740, 616],
				[754, 608],
				[800, 608],
				[816, 616],
				[816, 634],
				[820, 634],
				[820, 642],
				[824, 614],
				[824, 838],
				[820, 810],
				[820, 818],
				[816, 818],
				[816, 836],
				[802, 844],
				[750, 842],
				[750, 848],
				[746, 852],
				[670, 852],
				[612, 864],
				[554, 870],
				[484, 870],
				[420, 864],
				[398, 858],
				[382, 848],
				[370, 846],
				[352, 836],
				[330, 814],
				[330, 810],
				[310, 788],
				[294, 754],
				[292, 712],
				[294, 698],
				[304, 674],
				[308, 672],
				[316, 656],
				[322, 652],
				[322, 648],
				[330, 642],
				[330, 638],
				[358, 612],
				[382, 604],
				[404, 592],
				[456, 584]
			]],
			"legacyLengthIn": [330.57730263157896],
			"layoutLengthIn": 307,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 25 ft 7 in, including motor."
		},
		{
			"id": "evotti-4550",
			"sourceId": "4550",
			"name": "521QL 2027",
			"model": "521QL",
			"year": "2027",
			"series": "500",
			"floorplan": "Quad Lounge (QL)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "site-521ql",
			"path": "/_cdn/static/layout-evotti-site-521ql.webp",
			"width": 1e3,
			"height": 336,
			"imageRotation": -90,
			"builderSourceImageId": "145314",
			"builderSourceUrl": "https://11092797.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2385&deploy=1&compid=11092797&ns-at=AAEJ7tMQmANnupNoYlyBe144ImbOUypqD-vXVQpQl_kEQ8hzaV0&imageId=145314",
			"sourcePage": "https://evotti.com/500-series/",
			"imageBounds": [
				0,
				0,
				1e3,
				336
			],
			"imageContours": [[
				[479, 0],
				[632, 0],
				[632, 6],
				[631, 6],
				[631, 7],
				[702, 7],
				[702, 6],
				[704, 6],
				[704, 5],
				[708, 4],
				[709, 2],
				[711, 2],
				[711, 1],
				[714, 1],
				[714, 0],
				[758, 0],
				[758, 1],
				[886, 1],
				[886, 2],
				[894, 2],
				[894, 3],
				[899, 3],
				[899, 4],
				[903, 4],
				[903, 5],
				[909, 6],
				[909, 7],
				[912, 7],
				[912, 8],
				[914, 8],
				[914, 9],
				[917, 9],
				[917, 10],
				[919, 10],
				[919, 11],
				[921, 11],
				[921, 12],
				[925, 13],
				[925, 14],
				[927, 14],
				[928, 16],
				[930, 16],
				[930, 17],
				[932, 17],
				[932, 18],
				[935, 18],
				[935, 19],
				[939, 19],
				[939, 20],
				[943, 20],
				[943, 21],
				[946, 21],
				[946, 22],
				[950, 22],
				[950, 23],
				[953, 23],
				[953, 24],
				[957, 24],
				[957, 25],
				[959, 25],
				[959, 26],
				[962, 26],
				[962, 27],
				[965, 27],
				[965, 28],
				[967, 28],
				[968, 30],
				[972, 31],
				[972, 32],
				[973, 32],
				[973, 33],
				[974, 33],
				[975, 35],
				[977, 35],
				[977, 36],
				[979, 37],
				[979, 39],
				[980, 39],
				[980, 40],
				[982, 41],
				[982, 43],
				[983, 43],
				[983, 45],
				[985, 46],
				[985, 49],
				[986, 49],
				[986, 51],
				[987, 51],
				[987, 56],
				[988, 56],
				[988, 60],
				[989, 60],
				[989, 64],
				[990, 64],
				[990, 69],
				[991, 69],
				[991, 74],
				[992, 74],
				[992, 80],
				[993, 80],
				[993, 86],
				[994, 86],
				[994, 93],
				[995, 93],
				[995, 98],
				[996, 98],
				[997, 114],
				[998, 114],
				[998, 124],
				[999, 124],
				[999, 138],
				[1e3, 138],
				[1e3, 198],
				[999, 198],
				[999, 212],
				[998, 212],
				[998, 222],
				[997, 222],
				[996, 238],
				[995, 238],
				[995, 243],
				[994, 243],
				[994, 250],
				[993, 250],
				[993, 256],
				[992, 256],
				[991, 268],
				[990, 268],
				[990, 272],
				[989, 272],
				[988, 280],
				[987, 280],
				[987, 285],
				[986, 285],
				[986, 287],
				[985, 287],
				[985, 290],
				[984, 290],
				[984, 292],
				[983, 292],
				[983, 293],
				[982, 293],
				[982, 295],
				[981, 295],
				[981, 296],
				[979, 297],
				[979, 299],
				[978, 299],
				[978, 300],
				[977, 300],
				[976, 302],
				[974, 302],
				[974, 303],
				[973, 303],
				[972, 305],
				[970, 305],
				[969, 307],
				[967, 307],
				[967, 308],
				[965, 308],
				[965, 309],
				[962, 309],
				[962, 310],
				[960, 310],
				[960, 311],
				[957, 311],
				[957, 312],
				[953, 312],
				[953, 313],
				[947, 314],
				[947, 315],
				[943, 315],
				[943, 316],
				[939, 316],
				[939, 317],
				[936, 317],
				[936, 318],
				[932, 318],
				[932, 319],
				[928, 320],
				[927, 322],
				[925, 322],
				[925, 323],
				[923, 323],
				[923, 324],
				[921, 324],
				[921, 325],
				[917, 326],
				[917, 327],
				[914, 327],
				[914, 328],
				[912, 328],
				[912, 329],
				[906, 330],
				[906, 331],
				[902, 331],
				[902, 332],
				[899, 332],
				[899, 333],
				[894, 333],
				[894, 334],
				[886, 334],
				[886, 335],
				[786, 335],
				[786, 336],
				[426, 336],
				[426, 335],
				[411, 335],
				[325, 335],
				[325, 334],
				[308, 334],
				[308, 333],
				[293, 333],
				[293, 332],
				[280, 332],
				[280, 331],
				[263, 331],
				[263, 330],
				[252, 330],
				[252, 329],
				[168, 329],
				[168, 328],
				[156, 328],
				[156, 327],
				[146, 327],
				[146, 326],
				[139, 326],
				[139, 325],
				[132, 325],
				[132, 324],
				[128, 324],
				[128, 325],
				[126, 325],
				[126, 324],
				[120, 324],
				[120, 323],
				[116, 323],
				[116, 322],
				[114, 322],
				[114, 321],
				[113, 321],
				[113, 316],
				[106, 316],
				[106, 315],
				[102, 314],
				[102, 313],
				[101, 313],
				[101, 312],
				[99, 311],
				[99, 309],
				[100, 309],
				[100, 308],
				[103, 308],
				[103, 307],
				[95, 307],
				[95, 306],
				[94, 306],
				[93, 304],
				[91, 304],
				[91, 303],
				[90, 303],
				[90, 302],
				[89, 302],
				[89, 301],
				[87, 300],
				[87, 251],
				[88, 251],
				[88, 250],
				[97, 250],
				[97, 251],
				[99, 251],
				[99, 252],
				[100, 252],
				[101, 250],
				[104, 250],
				[104, 251],
				[105, 251],
				[104, 249],
				[102, 249],
				[102, 248],
				[100, 248],
				[100, 247],
				[99, 247],
				[99, 245],
				[100, 245],
				[100, 244],
				[102, 244],
				[102, 243],
				[114, 243],
				[114, 225],
				[115, 225],
				[115, 223],
				[118, 223],
				[118, 222],
				[124, 221],
				[124, 220],
				[128, 220],
				[128, 219],
				[134, 218],
				[134, 215],
				[135, 215],
				[135, 211],
				[138, 211],
				[138, 203],
				[137, 203],
				[137, 201],
				[126, 201],
				[126, 200],
				[125, 200],
				[125, 202],
				[124, 202],
				[124, 203],
				[99, 203],
				[99, 204],
				[94, 204],
				[94, 205],
				[88, 205],
				[88, 206],
				[82, 206],
				[82, 207],
				[70, 207],
				[70, 208],
				[55, 208],
				[55, 207],
				[42, 207],
				[42, 206],
				[34, 206],
				[34, 205],
				[30, 205],
				[30, 204],
				[28, 204],
				[28, 203],
				[26, 203],
				[26, 202],
				[24, 202],
				[24, 201],
				[21, 201],
				[21, 200],
				[19, 200],
				[18, 198],
				[16, 198],
				[16, 197],
				[15, 197],
				[15, 196],
				[14, 196],
				[14, 195],
				[13, 195],
				[13, 194],
				[11, 193],
				[11, 192],
				[10, 192],
				[10, 190],
				[9, 190],
				[9, 189],
				[7, 188],
				[7, 186],
				[6, 186],
				[6, 185],
				[4, 184],
				[4, 182],
				[3, 182],
				[3, 180],
				[2, 180],
				[2, 178],
				[1, 178],
				[1, 174],
				[0, 174],
				[0, 162],
				[1, 162],
				[1, 158],
				[2, 158],
				[3, 154],
				[5, 153],
				[5, 151],
				[7, 150],
				[7, 148],
				[8, 148],
				[8, 147],
				[10, 146],
				[10, 144],
				[11, 144],
				[11, 143],
				[12, 143],
				[12, 142],
				[13, 142],
				[13, 141],
				[14, 141],
				[15, 139],
				[16, 139],
				[16, 138],
				[18, 138],
				[19, 136],
				[22, 136],
				[22, 135],
				[24, 135],
				[24, 134],
				[26, 134],
				[26, 133],
				[30, 132],
				[30, 131],
				[34, 131],
				[34, 130],
				[41, 130],
				[41, 129],
				[53, 129],
				[53, 128],
				[71, 128],
				[71, 129],
				[82, 129],
				[82, 130],
				[89, 130],
				[89, 131],
				[94, 131],
				[94, 132],
				[99, 132],
				[99, 133],
				[107, 134],
				[107, 135],
				[110, 135],
				[110, 136],
				[114, 136],
				[114, 137],
				[116, 137],
				[116, 138],
				[120, 138],
				[120, 139],
				[122, 139],
				[122, 137],
				[124, 137],
				[124, 136],
				[129, 136],
				[129, 135],
				[134, 135],
				[134, 136],
				[135, 136],
				[135, 135],
				[137, 135],
				[137, 134],
				[138, 134],
				[138, 125],
				[135, 125],
				[135, 121],
				[134, 121],
				[134, 118],
				[131, 118],
				[131, 117],
				[127, 117],
				[127, 116],
				[121, 115],
				[121, 114],
				[115, 113],
				[115, 111],
				[114, 111],
				[114, 27],
				[113, 27],
				[113, 15],
				[114, 15],
				[114, 14],
				[116, 14],
				[116, 13],
				[120, 13],
				[120, 12],
				[126, 12],
				[126, 11],
				[128, 11],
				[128, 12],
				[132, 12],
				[132, 11],
				[138, 11],
				[138, 10],
				[147, 10],
				[147, 9],
				[155, 9],
				[155, 8],
				[170, 8],
				[170, 7],
				[249, 7],
				[249, 6],
				[265, 6],
				[265, 5],
				[277, 5],
				[277, 4],
				[292, 4],
				[293, 6],
				[313, 6],
				[314, 4],
				[311, 4],
				[311, 3],
				[319, 3],
				[319, 2],
				[350, 2],
				[350, 3],
				[379, 3],
				[379, 2],
				[386, 2],
				[386, 1],
				[396, 1],
				[396, 2],
				[397, 2],
				[397, 1],
				[406, 1],
				[406, 2],
				[408, 2],
				[408, 1],
				[479, 1]
			]],
			"legacyLengthIn": [303.57142857142856, 330.9538714991763]
		},
		{
			"id": "evotti-4554",
			"sourceId": "4554",
			"name": "523CL 2027",
			"model": "523CL",
			"year": "2027",
			"series": "500",
			"floorplan": "Convertible Lounge (CL)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "156543",
			"path": "/_cdn/static/layout-evotti-156543.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				292,
				117,
				3940,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2462, 116],
				[2800, 118],
				[2802, 136],
				[2798, 142],
				[3054, 142],
				[3066, 132],
				[3078, 128],
				[3088, 120],
				[3094, 122],
				[3096, 118],
				[3706, 120],
				[3770, 128],
				[3822, 144],
				[3844, 156],
				[3926, 168],
				[4006, 186],
				[4012, 190],
				[4036, 194],
				[4048, 200],
				[4056, 200],
				[4068, 206],
				[4100, 214],
				[4130, 230],
				[4166, 266],
				[4168, 274],
				[4172, 276],
				[4180, 292],
				[4188, 320],
				[4216, 472],
				[4226, 558],
				[4232, 648],
				[4232, 804],
				[4222, 934],
				[4196, 1096],
				[4192, 1104],
				[4184, 1148],
				[4170, 1180],
				[4160, 1190],
				[4160, 1194],
				[4124, 1226],
				[4100, 1238],
				[4064, 1250],
				[4056, 1250],
				[4022, 1262],
				[3972, 1272],
				[3956, 1278],
				[3846, 1296],
				[3832, 1304],
				[3784, 1320],
				[3712, 1330],
				[2868, 1334],
				[1642, 1330],
				[996, 1328],
				[992, 1308],
				[896, 1304],
				[880, 1300],
				[830, 1296],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1280],
				[744, 1262],
				[710, 1258],
				[698, 1246],
				[698, 1234],
				[704, 1232],
				[704, 1228],
				[680, 1228],
				[654, 1204],
				[654, 1026],
				[692, 1024],
				[700, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1002],
				[708, 998],
				[750, 998],
				[752, 926],
				[824, 904],
				[828, 882],
				[838, 880],
				[838, 854],
				[822, 838],
				[822, 810],
				[820, 818],
				[816, 818],
				[816, 836],
				[812, 840],
				[802, 844],
				[750, 842],
				[750, 848],
				[746, 852],
				[678, 850],
				[612, 864],
				[554, 870],
				[484, 870],
				[420, 864],
				[398, 858],
				[382, 848],
				[370, 846],
				[352, 836],
				[330, 814],
				[330, 810],
				[310, 788],
				[308, 780],
				[304, 778],
				[298, 766],
				[292, 742],
				[292, 712],
				[298, 686],
				[308, 668],
				[312, 666],
				[312, 662],
				[316, 660],
				[316, 656],
				[330, 642],
				[330, 638],
				[358, 612],
				[382, 604],
				[404, 592],
				[456, 584],
				[550, 582],
				[596, 586],
				[686, 604],
				[730, 618],
				[734, 622],
				[740, 622],
				[740, 616],
				[754, 608],
				[800, 608],
				[816, 616],
				[816, 634],
				[820, 634],
				[822, 642],
				[822, 614],
				[838, 598],
				[838, 572],
				[828, 570],
				[824, 548],
				[756, 528],
				[750, 522],
				[750, 216],
				[744, 214],
				[744, 172],
				[754, 166],
				[786, 160],
				[806, 162],
				[818, 158],
				[900, 148],
				[992, 144],
				[996, 124],
				[1492, 124],
				[1542, 120]
			]],
			"legacyLengthIn": [330.49342105263156],
			"layoutLengthIn": 334,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 27 ft 10 in, including motor."
		},
		{
			"id": "evotti-4552",
			"sourceId": "4552",
			"name": "523CS 2027",
			"model": "523CS",
			"year": "2027",
			"series": "500",
			"floorplan": "Convertible Stern (CS)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "145320",
			"path": "/_cdn/static/layout-evotti-145320.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				293,
				119,
				3939,
				1214
			],
			"imageRotation": -90,
			"imageContours": [[
				[2266, 118],
				[2800, 118],
				[2814, 120],
				[2812, 142],
				[2896, 144],
				[3052, 144],
				[3062, 136],
				[3074, 132],
				[3076, 128],
				[3084, 126],
				[3088, 120],
				[3712, 122],
				[3788, 134],
				[3830, 148],
				[3850, 158],
				[3902, 164],
				[3952, 174],
				[3960, 178],
				[3970, 178],
				[3994, 186],
				[4004, 186],
				[4010, 190],
				[4068, 204],
				[4112, 220],
				[4114, 224],
				[4126, 228],
				[4136, 238],
				[4140, 238],
				[4158, 256],
				[4158, 260],
				[4172, 276],
				[4184, 304],
				[4212, 444],
				[4228, 578],
				[4232, 646],
				[4232, 806],
				[4228, 874],
				[4212, 1008],
				[4194, 1106],
				[4182, 1154],
				[4160, 1194],
				[4132, 1220],
				[4098, 1238],
				[4068, 1248],
				[4060, 1248],
				[4048, 1254],
				[4040, 1254],
				[4034, 1258],
				[3962, 1276],
				[3878, 1292],
				[3850, 1294],
				[3820, 1308],
				[3772, 1322],
				[3714, 1330],
				[2944, 1334],
				[1860, 1332],
				[1524, 1330],
				[1288, 1314],
				[1236, 1308],
				[962, 1308],
				[870, 1300],
				[812, 1290],
				[792, 1292],
				[756, 1286],
				[746, 1280],
				[746, 1260],
				[720, 1260],
				[710, 1256],
				[698, 1244],
				[698, 1234],
				[706, 1228],
				[680, 1228],
				[656, 1204],
				[656, 1026],
				[720, 1024],
				[702, 1016],
				[698, 1012],
				[698, 1006],
				[704, 1e3],
				[716, 998],
				[752, 998],
				[754, 926],
				[824, 906],
				[830, 882],
				[838, 882],
				[838, 850],
				[824, 838],
				[824, 810],
				[818, 810],
				[818, 818],
				[812, 818],
				[816, 820],
				[816, 834],
				[810, 840],
				[750, 842],
				[746, 852],
				[672, 850],
				[630, 860],
				[572, 868],
				[464, 868],
				[416, 862],
				[396, 856],
				[384, 848],
				[378, 848],
				[354, 836],
				[348, 828],
				[344, 828],
				[338, 822],
				[338, 818],
				[314, 792],
				[298, 764],
				[294, 748],
				[292, 718],
				[298, 688],
				[304, 676],
				[308, 674],
				[310, 666],
				[328, 646],
				[328, 642],
				[360, 612],
				[380, 606],
				[408, 592],
				[466, 584],
				[570, 584],
				[618, 590],
				[690, 606],
				[738, 624],
				[740, 618],
				[752, 610],
				[804, 610],
				[816, 618],
				[814, 634],
				[818, 636],
				[818, 642],
				[824, 644],
				[824, 614],
				[838, 602],
				[838, 570],
				[830, 570],
				[824, 546],
				[804, 542],
				[780, 532],
				[772, 532],
				[754, 526],
				[752, 522],
				[752, 216],
				[746, 214],
				[746, 172],
				[756, 166],
				[792, 160],
				[812, 162],
				[824, 158],
				[888, 150],
				[966, 144],
				[1236, 144],
				[1262, 140],
				[1532, 122]
			]],
			"legacyLengthIn": [330.9538714991763],
			"layoutLengthIn": 334,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 27 ft 10 in, including motor."
		},
		{
			"id": "evotti-140",
			"sourceId": "140",
			"name": "523FL 2027",
			"model": "523FL",
			"year": "2027",
			"series": "500",
			"floorplan": "Fish Lounge (FL)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "156544",
			"path": "/_cdn/static/layout-evotti-156544.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				292,
				118,
				3941,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2050, 118],
				[2800, 118],
				[2802, 138],
				[2798, 142],
				[3054, 142],
				[3064, 134],
				[3072, 132],
				[3074, 128],
				[3086, 122],
				[3094, 122],
				[3096, 118],
				[3724, 122],
				[3784, 132],
				[3790, 136],
				[3822, 144],
				[3846, 156],
				[3956, 174],
				[3964, 178],
				[3974, 178],
				[4022, 190],
				[4082, 210],
				[4090, 210],
				[4136, 234],
				[4156, 252],
				[4156, 256],
				[4172, 274],
				[4186, 308],
				[4192, 344],
				[4196, 352],
				[4222, 510],
				[4232, 626],
				[4234, 780],
				[4222, 942],
				[4208, 1038],
				[4190, 1128],
				[4180, 1162],
				[4172, 1178],
				[4156, 1196],
				[4156, 1200],
				[4134, 1220],
				[4096, 1240],
				[4076, 1244],
				[4044, 1256],
				[4036, 1256],
				[4030, 1260],
				[3928, 1284],
				[3846, 1296],
				[3838, 1302],
				[3792, 1318],
				[3726, 1330],
				[2718, 1334],
				[1994, 1334],
				[1632, 1332],
				[1506, 1328],
				[840, 1328],
				[832, 1294],
				[818, 1294],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1276],
				[744, 1262],
				[716, 1260],
				[700, 1248],
				[698, 1236],
				[706, 1232],
				[704, 1228],
				[680, 1228],
				[670, 1216],
				[666, 1216],
				[656, 1206],
				[656, 1024],
				[692, 1024],
				[696, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1004],
				[708, 998],
				[752, 998],
				[752, 926],
				[822, 906],
				[826, 900],
				[828, 882],
				[838, 880],
				[838, 852],
				[826, 842],
				[826, 610],
				[834, 606],
				[838, 600],
				[838, 572],
				[828, 570],
				[826, 552],
				[822, 546],
				[752, 526],
				[752, 216],
				[744, 214],
				[744, 174],
				[748, 170],
				[752, 170],
				[754, 166],
				[788, 160],
				[808, 162],
				[832, 158],
				[840, 124],
				[1512, 124],
				[1666, 120]
			], [
				[502, 582],
				[578, 584],
				[634, 592],
				[700, 608],
				[730, 618],
				[734, 622],
				[740, 622],
				[740, 616],
				[754, 608],
				[800, 608],
				[816, 616],
				[816, 634],
				[820, 634],
				[820, 642],
				[824, 614],
				[824, 838],
				[820, 810],
				[820, 818],
				[816, 818],
				[816, 836],
				[802, 844],
				[750, 842],
				[750, 848],
				[746, 852],
				[670, 852],
				[612, 864],
				[554, 870],
				[484, 870],
				[420, 864],
				[398, 858],
				[382, 848],
				[370, 846],
				[352, 836],
				[330, 814],
				[330, 810],
				[310, 788],
				[294, 754],
				[292, 712],
				[294, 698],
				[304, 674],
				[308, 672],
				[316, 656],
				[322, 652],
				[322, 648],
				[330, 642],
				[330, 638],
				[358, 612],
				[382, 604],
				[404, 592],
				[456, 584]
			]],
			"legacyLengthIn": [330.57730263157896],
			"layoutLengthIn": 334,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 27 ft 10 in, including motor."
		},
		{
			"id": "evotti-4553",
			"sourceId": "4553",
			"name": "523QL 2027",
			"model": "523QL",
			"year": "2027",
			"series": "500",
			"floorplan": "Quad Lounge (QL)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "site-523ql",
			"path": "/_cdn/static/layout-evotti-site-523ql.webp",
			"width": 1e3,
			"height": 309,
			"imageRotation": -90,
			"builderSourceImageId": "145321",
			"builderSourceUrl": "https://11092797.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2385&deploy=1&compid=11092797&ns-at=AAEJ7tMQmANnupNoYlyBe144ImbOUypqD-vXVQpQl_kEQ8hzaV0&imageId=145321",
			"sourcePage": "https://evotti.com/500-series/",
			"imageBounds": [
				0,
				0,
				1e3,
				309
			],
			"imageContours": [[
				[451, 0],
				[637, 0],
				[637, 5],
				[636, 5],
				[636, 6],
				[702, 6],
				[702, 5],
				[704, 5],
				[705, 3],
				[707, 3],
				[707, 2],
				[709, 2],
				[709, 1],
				[712, 1],
				[712, 0],
				[813, 0],
				[813, 1],
				[873, 1],
				[873, 2],
				[880, 2],
				[880, 3],
				[885, 3],
				[885, 4],
				[888, 4],
				[888, 5],
				[892, 5],
				[892, 6],
				[895, 6],
				[895, 7],
				[897, 7],
				[897, 8],
				[900, 8],
				[900, 9],
				[902, 9],
				[902, 10],
				[909, 10],
				[909, 11],
				[915, 11],
				[915, 12],
				[920, 12],
				[920, 13],
				[930, 14],
				[930, 15],
				[935, 15],
				[935, 16],
				[938, 16],
				[938, 17],
				[943, 17],
				[943, 18],
				[946, 18],
				[946, 19],
				[950, 19],
				[950, 20],
				[953, 20],
				[953, 21],
				[957, 21],
				[957, 22],
				[963, 23],
				[963, 24],
				[966, 24],
				[966, 25],
				[968, 25],
				[968, 26],
				[972, 27],
				[973, 29],
				[975, 29],
				[975, 30],
				[976, 30],
				[976, 31],
				[977, 31],
				[977, 32],
				[978, 32],
				[978, 33],
				[979, 33],
				[979, 34],
				[980, 34],
				[980, 35],
				[982, 36],
				[982, 37],
				[983, 37],
				[983, 39],
				[985, 40],
				[985, 42],
				[986, 42],
				[986, 44],
				[987, 44],
				[987, 47],
				[988, 47],
				[988, 51],
				[989, 51],
				[990, 59],
				[991, 59],
				[991, 64],
				[992, 64],
				[992, 69],
				[993, 69],
				[993, 75],
				[994, 75],
				[994, 81],
				[995, 81],
				[995, 88],
				[996, 88],
				[996, 96],
				[997, 96],
				[997, 102],
				[998, 102],
				[998, 112],
				[999, 112],
				[999, 123],
				[1e3, 123],
				[1e3, 186],
				[999, 186],
				[999, 197],
				[998, 197],
				[998, 207],
				[997, 207],
				[997, 214],
				[996, 214],
				[996, 221],
				[995, 221],
				[995, 228],
				[994, 228],
				[994, 234],
				[993, 234],
				[993, 240],
				[992, 240],
				[991, 250],
				[990, 250],
				[990, 253],
				[989, 253],
				[989, 258],
				[988, 258],
				[988, 262],
				[987, 262],
				[987, 265],
				[986, 265],
				[985, 269],
				[983, 270],
				[983, 272],
				[981, 273],
				[981, 275],
				[980, 275],
				[979, 277],
				[977, 277],
				[977, 278],
				[976, 278],
				[976, 279],
				[975, 279],
				[974, 281],
				[972, 281],
				[972, 282],
				[970, 282],
				[970, 283],
				[966, 284],
				[966, 285],
				[960, 286],
				[960, 287],
				[954, 288],
				[954, 289],
				[950, 289],
				[950, 290],
				[946, 290],
				[946, 291],
				[942, 291],
				[942, 292],
				[939, 292],
				[939, 293],
				[934, 293],
				[934, 294],
				[930, 294],
				[930, 295],
				[925, 295],
				[925, 296],
				[915, 297],
				[915, 298],
				[909, 298],
				[909, 299],
				[902, 299],
				[902, 300],
				[900, 300],
				[900, 301],
				[897, 301],
				[897, 302],
				[895, 302],
				[895, 303],
				[889, 304],
				[889, 305],
				[885, 305],
				[885, 306],
				[875, 307],
				[875, 308],
				[792, 308],
				[792, 309],
				[422, 309],
				[398, 309],
				[398, 308],
				[304, 308],
				[304, 307],
				[293, 307],
				[293, 306],
				[276, 306],
				[276, 305],
				[261, 305],
				[261, 304],
				[248, 304],
				[248, 303],
				[170, 303],
				[170, 302],
				[148, 301],
				[148, 300],
				[140, 300],
				[140, 299],
				[133, 299],
				[133, 298],
				[121, 298],
				[121, 297],
				[118, 297],
				[118, 296],
				[116, 296],
				[116, 295],
				[115, 295],
				[115, 291],
				[107, 290],
				[107, 289],
				[106, 289],
				[105, 287],
				[103, 287],
				[103, 284],
				[104, 284],
				[104, 283],
				[106, 283],
				[106, 282],
				[98, 282],
				[98, 281],
				[97, 281],
				[97, 280],
				[96, 280],
				[96, 279],
				[95, 279],
				[95, 278],
				[93, 277],
				[93, 276],
				[92, 276],
				[92, 273],
				[93, 273],
				[93, 234],
				[92, 234],
				[92, 230],
				[102, 230],
				[102, 231],
				[104, 231],
				[104, 230],
				[108, 230],
				[108, 229],
				[105, 229],
				[105, 228],
				[103, 228],
				[103, 225],
				[104, 225],
				[104, 224],
				[111, 224],
				[111, 223],
				[117, 223],
				[117, 222],
				[116, 222],
				[116, 207],
				[117, 207],
				[117, 205],
				[120, 205],
				[120, 204],
				[123, 204],
				[123, 203],
				[127, 203],
				[127, 202],
				[133, 201],
				[133, 200],
				[135, 200],
				[136, 194],
				[139, 194],
				[139, 187],
				[138, 187],
				[138, 185],
				[137, 185],
				[137, 184],
				[135, 183],
				[135, 176],
				[134, 176],
				[134, 178],
				[133, 178],
				[133, 183],
				[131, 183],
				[131, 184],
				[116, 184],
				[116, 186],
				[115, 186],
				[115, 187],
				[108, 187],
				[108, 186],
				[97, 186],
				[97, 187],
				[91, 187],
				[91, 188],
				[86, 188],
				[86, 189],
				[72, 190],
				[72, 191],
				[45, 191],
				[45, 190],
				[34, 190],
				[34, 189],
				[29, 189],
				[29, 188],
				[27, 188],
				[27, 187],
				[24, 187],
				[24, 186],
				[22, 186],
				[22, 185],
				[20, 185],
				[20, 184],
				[16, 183],
				[16, 182],
				[15, 182],
				[15, 181],
				[14, 181],
				[14, 180],
				[13, 180],
				[13, 179],
				[12, 179],
				[12, 178],
				[11, 178],
				[11, 177],
				[9, 176],
				[9, 175],
				[8, 175],
				[8, 173],
				[7, 173],
				[7, 172],
				[5, 171],
				[5, 169],
				[3, 168],
				[3, 166],
				[2, 166],
				[2, 164],
				[1, 164],
				[1, 160],
				[0, 160],
				[0, 149],
				[1, 149],
				[1, 145],
				[2, 145],
				[3, 141],
				[5, 140],
				[5, 138],
				[6, 138],
				[6, 137],
				[8, 136],
				[8, 134],
				[9, 134],
				[9, 133],
				[10, 133],
				[10, 132],
				[11, 132],
				[11, 131],
				[12, 131],
				[12, 130],
				[13, 130],
				[13, 129],
				[14, 129],
				[15, 127],
				[16, 127],
				[16, 126],
				[18, 126],
				[18, 125],
				[20, 125],
				[20, 124],
				[24, 123],
				[24, 122],
				[30, 121],
				[30, 120],
				[34, 120],
				[34, 119],
				[45, 119],
				[45, 118],
				[70, 118],
				[70, 119],
				[80, 119],
				[80, 120],
				[86, 120],
				[86, 121],
				[91, 121],
				[91, 122],
				[95, 122],
				[95, 123],
				[99, 123],
				[99, 124],
				[103, 124],
				[103, 125],
				[109, 126],
				[109, 127],
				[111, 127],
				[111, 128],
				[114, 128],
				[114, 126],
				[116, 126],
				[116, 125],
				[119, 125],
				[119, 124],
				[125, 124],
				[125, 125],
				[131, 125],
				[131, 126],
				[133, 126],
				[133, 131],
				[134, 131],
				[134, 133],
				[135, 133],
				[135, 126],
				[136, 126],
				[136, 125],
				[138, 124],
				[138, 122],
				[139, 122],
				[139, 115],
				[136, 115],
				[135, 109],
				[133, 109],
				[133, 108],
				[130, 108],
				[130, 107],
				[127, 107],
				[127, 106],
				[123, 106],
				[123, 105],
				[120, 105],
				[120, 104],
				[117, 104],
				[117, 102],
				[116, 102],
				[116, 26],
				[117, 26],
				[117, 25],
				[115, 25],
				[115, 14],
				[116, 14],
				[117, 12],
				[122, 12],
				[122, 11],
				[128, 11],
				[128, 10],
				[129, 10],
				[129, 11],
				[133, 11],
				[133, 10],
				[141, 10],
				[141, 9],
				[148, 9],
				[148, 8],
				[158, 8],
				[158, 7],
				[175, 7],
				[175, 6],
				[249, 6],
				[249, 5],
				[260, 5],
				[260, 4],
				[279, 4],
				[279, 3],
				[290, 3],
				[290, 2],
				[296, 2],
				[296, 4],
				[295, 4],
				[295, 5],
				[311, 5],
				[311, 4],
				[302, 4],
				[302, 3],
				[304, 3],
				[304, 2],
				[312, 2],
				[312, 3],
				[325, 3],
				[325, 2],
				[333, 2],
				[333, 1],
				[416, 1],
				[416, 2],
				[424, 2],
				[424, 1],
				[451, 1]
			]],
			"legacyLengthIn": [330.09708737864077, 330.9538714991763]
		},
		{
			"id": "evotti-4557",
			"sourceId": "4557",
			"name": "525CL 2027",
			"model": "525CL",
			"year": "2027",
			"series": "500",
			"floorplan": "Convertible Lounge (CL)",
			"widthIn": 102,
			"lengthIn": 300,
			"sourceImageId": "156540",
			"path": "/_cdn/static/layout-evotti-156540.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				292,
				117,
				3940,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2462, 116],
				[2814, 118],
				[2814, 132],
				[2892, 134],
				[3066, 134],
				[3076, 122],
				[3088, 118],
				[3706, 120],
				[3770, 128],
				[3822, 144],
				[3844, 156],
				[3926, 168],
				[4006, 186],
				[4012, 190],
				[4036, 194],
				[4048, 200],
				[4056, 200],
				[4068, 206],
				[4100, 214],
				[4130, 230],
				[4166, 266],
				[4168, 274],
				[4172, 276],
				[4180, 292],
				[4188, 320],
				[4216, 472],
				[4226, 558],
				[4232, 648],
				[4232, 804],
				[4222, 934],
				[4196, 1096],
				[4192, 1104],
				[4184, 1148],
				[4170, 1180],
				[4160, 1190],
				[4160, 1194],
				[4124, 1226],
				[4100, 1238],
				[4064, 1250],
				[4056, 1250],
				[4022, 1262],
				[3972, 1272],
				[3956, 1278],
				[3846, 1296],
				[3832, 1304],
				[3784, 1320],
				[3712, 1330],
				[2868, 1334],
				[1628, 1330],
				[996, 1328],
				[992, 1308],
				[896, 1304],
				[880, 1300],
				[830, 1296],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1280],
				[744, 1262],
				[710, 1258],
				[698, 1246],
				[698, 1234],
				[704, 1232],
				[704, 1228],
				[680, 1228],
				[654, 1204],
				[654, 1026],
				[692, 1024],
				[700, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1002],
				[708, 998],
				[750, 998],
				[752, 926],
				[824, 904],
				[828, 882],
				[838, 880],
				[838, 854],
				[822, 838],
				[822, 810],
				[820, 818],
				[816, 818],
				[816, 836],
				[812, 840],
				[802, 844],
				[750, 842],
				[750, 848],
				[746, 852],
				[678, 850],
				[612, 864],
				[554, 870],
				[484, 870],
				[420, 864],
				[398, 858],
				[382, 848],
				[370, 846],
				[352, 836],
				[330, 814],
				[330, 810],
				[310, 788],
				[308, 780],
				[304, 778],
				[298, 766],
				[292, 742],
				[292, 712],
				[298, 686],
				[308, 668],
				[312, 666],
				[312, 662],
				[316, 660],
				[316, 656],
				[330, 642],
				[330, 638],
				[358, 612],
				[382, 604],
				[404, 592],
				[456, 584],
				[550, 582],
				[596, 586],
				[686, 604],
				[730, 618],
				[734, 622],
				[740, 622],
				[740, 616],
				[754, 608],
				[800, 608],
				[816, 616],
				[816, 634],
				[820, 634],
				[822, 642],
				[822, 614],
				[838, 598],
				[838, 572],
				[828, 570],
				[824, 548],
				[756, 528],
				[750, 522],
				[750, 216],
				[744, 214],
				[744, 172],
				[754, 166],
				[786, 160],
				[806, 162],
				[818, 158],
				[900, 148],
				[992, 144],
				[996, 124],
				[1492, 124],
				[1542, 120]
			]],
			"legacyLengthIn": [330.49342105263156],
			"layoutLengthIn": 350,
			"dimensionMode": "calibrated",
			"dimensionBasis": "Approximate 29 ft 2 in overall footprint, based on the verified 25-foot Quad Lounge image at 102-inch beam."
		},
		{
			"id": "evotti-4556",
			"sourceId": "4556",
			"name": "525CS 2027",
			"model": "525CS",
			"year": "2027",
			"series": "500",
			"floorplan": "Convertible Stern (CS)",
			"widthIn": 102,
			"lengthIn": 300,
			"sourceImageId": "145313",
			"path": "/_cdn/static/layout-evotti-145313.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				293,
				119,
				3939,
				1214
			],
			"imageRotation": -90,
			"imageContours": [[
				[2282, 118],
				[2800, 118],
				[2814, 120],
				[2814, 146],
				[3054, 144],
				[3056, 140],
				[3072, 132],
				[3082, 120],
				[3710, 122],
				[3762, 128],
				[3814, 142],
				[3818, 146],
				[3830, 148],
				[3850, 158],
				[3912, 166],
				[4026, 192],
				[4032, 196],
				[4040, 196],
				[4046, 200],
				[4054, 200],
				[4098, 214],
				[4126, 228],
				[4158, 256],
				[4158, 260],
				[4172, 276],
				[4184, 304],
				[4214, 458],
				[4230, 610],
				[4232, 802],
				[4228, 872],
				[4208, 1032],
				[4182, 1154],
				[4160, 1194],
				[4132, 1220],
				[4098, 1238],
				[3970, 1274],
				[3878, 1292],
				[3850, 1294],
				[3802, 1314],
				[3736, 1328],
				[2858, 1334],
				[1872, 1332],
				[1524, 1330],
				[1262, 1312],
				[1236, 1308],
				[962, 1308],
				[870, 1300],
				[812, 1290],
				[792, 1292],
				[756, 1286],
				[754, 1282],
				[746, 1280],
				[746, 1260],
				[722, 1260],
				[710, 1256],
				[698, 1244],
				[698, 1230],
				[680, 1228],
				[656, 1204],
				[656, 1026],
				[678, 1022],
				[700, 1026],
				[708, 1022],
				[702, 1014],
				[698, 1014],
				[700, 1002],
				[718, 998],
				[752, 998],
				[754, 926],
				[824, 906],
				[830, 882],
				[838, 880],
				[836, 848],
				[822, 834],
				[816, 832],
				[810, 840],
				[804, 842],
				[750, 842],
				[746, 852],
				[670, 850],
				[630, 860],
				[572, 868],
				[462, 868],
				[408, 860],
				[354, 836],
				[348, 828],
				[344, 828],
				[338, 822],
				[338, 818],
				[328, 810],
				[328, 806],
				[306, 780],
				[296, 758],
				[292, 734],
				[292, 718],
				[298, 688],
				[304, 676],
				[308, 674],
				[310, 666],
				[328, 646],
				[328, 642],
				[360, 612],
				[380, 606],
				[408, 592],
				[466, 584],
				[532, 582],
				[604, 588],
				[690, 606],
				[702, 612],
				[722, 616],
				[732, 622],
				[740, 622],
				[740, 618],
				[746, 612],
				[762, 608],
				[804, 610],
				[816, 618],
				[814, 634],
				[818, 636],
				[818, 642],
				[824, 642],
				[824, 614],
				[838, 602],
				[838, 570],
				[830, 570],
				[824, 546],
				[798, 540],
				[780, 532],
				[772, 532],
				[754, 526],
				[752, 522],
				[752, 216],
				[746, 214],
				[746, 172],
				[756, 166],
				[792, 160],
				[812, 162],
				[824, 158],
				[888, 150],
				[968, 144],
				[1236, 144],
				[1372, 132],
				[1538, 122]
			]],
			"legacyLengthIn": [330.9538714991763],
			"layoutLengthIn": 350,
			"dimensionMode": "calibrated",
			"dimensionBasis": "Approximate 29 ft 2 in overall footprint, based on the verified 25-foot Quad Lounge image at 102-inch beam."
		},
		{
			"id": "evotti-4555",
			"sourceId": "4555",
			"name": "525QL 2027",
			"model": "525QL",
			"year": "2027",
			"series": "500",
			"floorplan": "Quad Lounge (QL)",
			"widthIn": 102,
			"lengthIn": 300,
			"sourceImageId": "site-525ql",
			"path": "/_cdn/static/layout-evotti-site-525ql.webp",
			"width": 1e3,
			"height": 291,
			"imageRotation": -90,
			"builderSourceImageId": "145314",
			"builderSourceUrl": "https://11092797.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2385&deploy=1&compid=11092797&ns-at=AAEJ7tMQmANnupNoYlyBe144ImbOUypqD-vXVQpQl_kEQ8hzaV0&imageId=145314",
			"sourcePage": "https://evotti.com/500-series/",
			"imageBounds": [
				0,
				0,
				1e3,
				291
			],
			"imageContours": [[
				[431, 0],
				[434, 0],
				[434, 1],
				[446, 1],
				[446, 0],
				[594, 0],
				[594, 5],
				[593, 5],
				[593, 6],
				[654, 6],
				[654, 5],
				[657, 5],
				[658, 3],
				[660, 3],
				[661, 1],
				[664, 1],
				[664, 0],
				[824, 0],
				[824, 1],
				[883, 1],
				[883, 2],
				[889, 2],
				[889, 3],
				[893, 3],
				[893, 4],
				[897, 4],
				[897, 5],
				[901, 5],
				[901, 6],
				[904, 6],
				[904, 7],
				[906, 7],
				[906, 8],
				[910, 9],
				[910, 10],
				[916, 10],
				[916, 11],
				[923, 11],
				[923, 12],
				[927, 12],
				[927, 13],
				[932, 13],
				[932, 14],
				[937, 14],
				[937, 15],
				[941, 15],
				[941, 16],
				[946, 16],
				[946, 17],
				[949, 17],
				[949, 18],
				[953, 18],
				[953, 19],
				[959, 20],
				[959, 21],
				[962, 21],
				[962, 22],
				[966, 22],
				[966, 23],
				[968, 23],
				[968, 24],
				[971, 24],
				[972, 26],
				[976, 27],
				[976, 28],
				[977, 28],
				[977, 29],
				[978, 29],
				[978, 30],
				[979, 30],
				[979, 31],
				[980, 31],
				[980, 32],
				[981, 32],
				[981, 33],
				[983, 34],
				[983, 35],
				[984, 35],
				[984, 37],
				[986, 38],
				[986, 40],
				[987, 40],
				[987, 42],
				[988, 42],
				[988, 45],
				[989, 45],
				[989, 50],
				[990, 50],
				[991, 58],
				[992, 58],
				[992, 64],
				[993, 64],
				[993, 69],
				[994, 69],
				[994, 75],
				[995, 75],
				[995, 83],
				[996, 83],
				[996, 88],
				[997, 88],
				[997, 96],
				[998, 96],
				[998, 105],
				[999, 105],
				[999, 117],
				[1e3, 117],
				[1e3, 175],
				[999, 175],
				[999, 187],
				[998, 187],
				[997, 203],
				[996, 203],
				[996, 209],
				[995, 209],
				[995, 216],
				[994, 216],
				[994, 222],
				[993, 222],
				[993, 227],
				[992, 227],
				[992, 233],
				[991, 233],
				[991, 238],
				[990, 238],
				[990, 242],
				[989, 242],
				[989, 247],
				[988, 247],
				[988, 249],
				[987, 249],
				[987, 251],
				[986, 251],
				[985, 255],
				[983, 256],
				[983, 258],
				[982, 258],
				[982, 259],
				[981, 259],
				[981, 260],
				[980, 260],
				[980, 261],
				[978, 262],
				[978, 263],
				[974, 264],
				[973, 266],
				[971, 266],
				[971, 267],
				[969, 267],
				[969, 268],
				[967, 268],
				[967, 269],
				[963, 269],
				[963, 270],
				[957, 271],
				[957, 272],
				[954, 272],
				[954, 273],
				[950, 273],
				[950, 274],
				[946, 274],
				[946, 275],
				[942, 275],
				[942, 276],
				[938, 276],
				[938, 277],
				[933, 277],
				[933, 278],
				[929, 278],
				[929, 279],
				[924, 279],
				[924, 280],
				[918, 280],
				[918, 281],
				[912, 281],
				[912, 282],
				[909, 282],
				[909, 283],
				[907, 283],
				[907, 284],
				[904, 284],
				[904, 285],
				[902, 285],
				[902, 286],
				[898, 286],
				[898, 287],
				[894, 287],
				[894, 288],
				[890, 288],
				[890, 289],
				[886, 289],
				[886, 290],
				[859, 290],
				[859, 291],
				[484, 291],
				[338, 291],
				[338, 290],
				[272, 290],
				[272, 289],
				[261, 289],
				[261, 288],
				[248, 288],
				[248, 287],
				[218, 286],
				[218, 285],
				[147, 285],
				[147, 284],
				[136, 284],
				[136, 283],
				[128, 283],
				[128, 282],
				[120, 282],
				[120, 281],
				[109, 281],
				[109, 280],
				[103, 280],
				[103, 279],
				[101, 278],
				[101, 274],
				[92, 274],
				[92, 273],
				[90, 273],
				[90, 272],
				[88, 271],
				[88, 269],
				[87, 269],
				[87, 268],
				[88, 268],
				[88, 267],
				[90, 267],
				[90, 266],
				[82, 266],
				[82, 264],
				[81, 264],
				[81, 263],
				[79, 262],
				[79, 260],
				[78, 260],
				[78, 217],
				[87, 217],
				[87, 218],
				[89, 218],
				[89, 217],
				[92, 217],
				[92, 216],
				[90, 216],
				[90, 215],
				[88, 215],
				[88, 214],
				[87, 214],
				[87, 212],
				[88, 212],
				[88, 211],
				[102, 211],
				[102, 195],
				[103, 195],
				[104, 193],
				[107, 193],
				[107, 192],
				[113, 191],
				[113, 190],
				[117, 190],
				[117, 189],
				[119, 189],
				[119, 187],
				[120, 187],
				[120, 184],
				[121, 184],
				[121, 183],
				[123, 183],
				[123, 175],
				[122, 175],
				[122, 174],
				[110, 174],
				[110, 176],
				[88, 176],
				[88, 177],
				[78, 178],
				[78, 179],
				[69, 179],
				[69, 180],
				[41, 180],
				[41, 179],
				[31, 179],
				[31, 178],
				[27, 178],
				[27, 177],
				[25, 177],
				[25, 176],
				[23, 176],
				[23, 175],
				[17, 174],
				[17, 173],
				[16, 173],
				[15, 171],
				[13, 171],
				[13, 170],
				[12, 170],
				[12, 169],
				[10, 168],
				[10, 166],
				[9, 166],
				[9, 165],
				[8, 165],
				[8, 164],
				[6, 163],
				[6, 161],
				[4, 160],
				[4, 158],
				[2, 157],
				[2, 154],
				[1, 154],
				[1, 150],
				[0, 150],
				[0, 141],
				[1, 141],
				[1, 137],
				[2, 137],
				[3, 133],
				[5, 132],
				[5, 130],
				[7, 129],
				[7, 127],
				[8, 127],
				[8, 126],
				[9, 126],
				[9, 125],
				[10, 125],
				[10, 124],
				[11, 124],
				[11, 123],
				[12, 123],
				[12, 122],
				[13, 122],
				[13, 121],
				[14, 121],
				[15, 119],
				[16, 119],
				[16, 118],
				[18, 118],
				[18, 117],
				[21, 117],
				[21, 116],
				[23, 116],
				[23, 115],
				[25, 115],
				[25, 114],
				[28, 114],
				[28, 113],
				[33, 113],
				[33, 112],
				[43, 112],
				[43, 111],
				[67, 111],
				[67, 112],
				[75, 112],
				[75, 113],
				[82, 113],
				[82, 114],
				[86, 114],
				[86, 115],
				[91, 115],
				[91, 116],
				[94, 116],
				[94, 117],
				[98, 117],
				[98, 118],
				[104, 119],
				[104, 120],
				[107, 120],
				[107, 121],
				[108, 121],
				[108, 119],
				[110, 119],
				[110, 118],
				[112, 118],
				[112, 117],
				[122, 117],
				[122, 116],
				[123, 116],
				[123, 109],
				[122, 109],
				[122, 108],
				[120, 107],
				[120, 104],
				[119, 104],
				[119, 102],
				[116, 102],
				[116, 101],
				[112, 101],
				[112, 100],
				[106, 99],
				[106, 98],
				[103, 98],
				[103, 96],
				[102, 96],
				[102, 23],
				[101, 23],
				[101, 13],
				[102, 13],
				[102, 12],
				[104, 12],
				[104, 11],
				[111, 11],
				[111, 10],
				[115, 10],
				[115, 11],
				[116, 11],
				[116, 10],
				[122, 10],
				[122, 9],
				[130, 9],
				[130, 8],
				[138, 8],
				[138, 7],
				[152, 7],
				[152, 6],
				[222, 6],
				[222, 5],
				[236, 5],
				[236, 4],
				[251, 4],
				[251, 3],
				[265, 3],
				[265, 2],
				[279, 2],
				[279, 1],
				[431, 1]
			]],
			"legacyLengthIn": [330.9538714991763, 350.5154639175258]
		},
		{
			"id": "evotti-4564",
			"sourceId": "4564",
			"name": "721CL 2027",
			"model": "721CL",
			"year": "2027",
			"series": "700",
			"floorplan": "Convertible Lounge (CL)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "156547",
			"path": "/_cdn/static/layout-evotti-156547.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				656,
				118,
				3577,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2050, 118],
				[2802, 118],
				[2802, 138],
				[2798, 142],
				[3054, 142],
				[3064, 134],
				[3072, 132],
				[3074, 128],
				[3086, 122],
				[3094, 122],
				[3096, 118],
				[3724, 122],
				[3784, 132],
				[3790, 136],
				[3822, 144],
				[3846, 156],
				[3956, 174],
				[3964, 178],
				[3974, 178],
				[4022, 190],
				[4082, 210],
				[4090, 210],
				[4136, 234],
				[4156, 252],
				[4156, 256],
				[4172, 274],
				[4186, 308],
				[4192, 344],
				[4196, 352],
				[4222, 510],
				[4232, 626],
				[4234, 780],
				[4222, 942],
				[4208, 1038],
				[4190, 1128],
				[4180, 1162],
				[4172, 1178],
				[4156, 1196],
				[4156, 1200],
				[4134, 1220],
				[4096, 1240],
				[4076, 1244],
				[4044, 1256],
				[4036, 1256],
				[4030, 1260],
				[3928, 1284],
				[3846, 1296],
				[3838, 1302],
				[3792, 1318],
				[3726, 1330],
				[2714, 1334],
				[1994, 1334],
				[1632, 1332],
				[1506, 1328],
				[996, 1328],
				[992, 1308],
				[898, 1304],
				[818, 1294],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1276],
				[744, 1262],
				[716, 1260],
				[700, 1248],
				[698, 1236],
				[706, 1232],
				[704, 1228],
				[680, 1228],
				[670, 1216],
				[666, 1216],
				[656, 1206],
				[656, 1024],
				[692, 1024],
				[696, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1004],
				[708, 998],
				[752, 998],
				[752, 926],
				[822, 906],
				[826, 900],
				[828, 882],
				[838, 880],
				[838, 852],
				[822, 838],
				[822, 614],
				[838, 600],
				[838, 572],
				[828, 570],
				[826, 552],
				[822, 546],
				[752, 526],
				[752, 216],
				[744, 214],
				[744, 174],
				[748, 170],
				[752, 170],
				[754, 166],
				[774, 162],
				[808, 162],
				[820, 158],
				[900, 148],
				[992, 144],
				[996, 124],
				[1512, 124],
				[1666, 120]
			]],
			"legacyLengthIn": [300.0444078947368],
			"layoutLengthIn": 307,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 25 ft 7 in, including motor."
		},
		{
			"id": "evotti-4563",
			"sourceId": "4563",
			"name": "721CS 2027",
			"model": "721CS",
			"year": "2027",
			"series": "700",
			"floorplan": "Convertible Stern (CS)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "145340",
			"path": "/_cdn/static/layout-evotti-145340.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				293,
				119,
				3939,
				1214
			],
			"imageRotation": -90,
			"imageContours": [[
				[2286, 118],
				[2800, 118],
				[2800, 138],
				[2796, 144],
				[3052, 144],
				[3064, 138],
				[3066, 134],
				[3074, 132],
				[3076, 128],
				[3088, 122],
				[3092, 124],
				[3096, 120],
				[3710, 122],
				[3750, 126],
				[3788, 134],
				[3830, 148],
				[3850, 158],
				[3902, 164],
				[3962, 176],
				[3994, 186],
				[4004, 186],
				[4010, 190],
				[4034, 194],
				[4108, 218],
				[4110, 222],
				[4126, 228],
				[4136, 238],
				[4140, 238],
				[4158, 256],
				[4158, 260],
				[4172, 276],
				[4182, 298],
				[4210, 432],
				[4228, 578],
				[4232, 646],
				[4232, 806],
				[4228, 874],
				[4206, 1044],
				[4180, 1160],
				[4172, 1176],
				[4168, 1178],
				[4166, 1186],
				[4140, 1214],
				[4098, 1238],
				[3962, 1276],
				[3878, 1292],
				[3850, 1294],
				[3820, 1308],
				[3772, 1322],
				[3710, 1330],
				[2858, 1334],
				[1852, 1332],
				[1530, 1330],
				[1288, 1314],
				[1236, 1308],
				[964, 1308],
				[870, 1300],
				[812, 1290],
				[792, 1292],
				[756, 1286],
				[754, 1282],
				[746, 1280],
				[746, 1260],
				[722, 1260],
				[710, 1256],
				[698, 1244],
				[698, 1236],
				[700, 1232],
				[706, 1232],
				[706, 1228],
				[682, 1228],
				[656, 1204],
				[656, 1026],
				[722, 1024],
				[702, 1016],
				[698, 1012],
				[700, 1002],
				[718, 998],
				[752, 998],
				[754, 926],
				[824, 906],
				[830, 882],
				[838, 882],
				[838, 850],
				[824, 838],
				[824, 832],
				[816, 824],
				[816, 834],
				[804, 842],
				[750, 842],
				[746, 852],
				[670, 850],
				[630, 860],
				[570, 868],
				[466, 868],
				[408, 860],
				[354, 836],
				[348, 828],
				[344, 828],
				[338, 822],
				[338, 818],
				[328, 810],
				[328, 806],
				[306, 780],
				[296, 758],
				[292, 734],
				[292, 718],
				[298, 688],
				[304, 676],
				[308, 674],
				[310, 666],
				[328, 646],
				[328, 642],
				[360, 612],
				[380, 606],
				[408, 592],
				[466, 584],
				[568, 584],
				[618, 590],
				[690, 606],
				[738, 624],
				[740, 618],
				[752, 610],
				[804, 610],
				[816, 618],
				[814, 634],
				[818, 636],
				[818, 642],
				[824, 644],
				[824, 614],
				[838, 602],
				[838, 570],
				[830, 570],
				[824, 546],
				[804, 542],
				[780, 532],
				[772, 532],
				[754, 526],
				[752, 522],
				[752, 216],
				[746, 214],
				[746, 172],
				[756, 166],
				[792, 160],
				[812, 162],
				[824, 158],
				[888, 150],
				[966, 144],
				[1238, 144],
				[1372, 132],
				[1538, 122]
			]],
			"legacyLengthIn": [330.9538714991763],
			"layoutLengthIn": 307,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 25 ft 7 in, including motor."
		},
		{
			"id": "evotti-4562",
			"sourceId": "4562",
			"name": "721QL 2027",
			"model": "721QL",
			"year": "2027",
			"series": "700",
			"floorplan": "Quad Lounge (QL)",
			"widthIn": 102,
			"lengthIn": 252,
			"sourceImageId": "site-721ql",
			"path": "/_cdn/static/layout-evotti-site-721ql.webp",
			"width": 1e3,
			"height": 336,
			"imageRotation": -90,
			"builderSourceImageId": "145341",
			"builderSourceUrl": "https://11092797.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2385&deploy=1&compid=11092797&ns-at=AAEJ7tMQmANnupNoYlyBe144ImbOUypqD-vXVQpQl_kEQ8hzaV0&imageId=145341",
			"sourcePage": "https://evotti.com/700-series/",
			"imageBounds": [
				0,
				0,
				1e3,
				336
			],
			"imageContours": [[
				[480, 0],
				[632, 0],
				[632, 6],
				[631, 6],
				[631, 7],
				[702, 7],
				[702, 6],
				[704, 6],
				[704, 5],
				[708, 4],
				[709, 2],
				[711, 2],
				[711, 1],
				[714, 1],
				[714, 0],
				[761, 0],
				[761, 1],
				[887, 1],
				[887, 2],
				[899, 3],
				[899, 4],
				[903, 4],
				[903, 5],
				[909, 6],
				[909, 7],
				[912, 7],
				[912, 8],
				[914, 8],
				[914, 9],
				[917, 9],
				[917, 10],
				[919, 10],
				[919, 11],
				[921, 11],
				[921, 12],
				[925, 13],
				[925, 14],
				[927, 14],
				[928, 16],
				[930, 16],
				[930, 17],
				[932, 17],
				[932, 18],
				[935, 18],
				[935, 19],
				[939, 19],
				[939, 20],
				[943, 20],
				[943, 21],
				[946, 21],
				[946, 22],
				[950, 22],
				[950, 23],
				[953, 23],
				[953, 24],
				[957, 24],
				[957, 25],
				[959, 25],
				[959, 26],
				[962, 26],
				[962, 27],
				[965, 27],
				[965, 28],
				[967, 28],
				[968, 30],
				[972, 31],
				[972, 32],
				[973, 32],
				[973, 33],
				[974, 33],
				[975, 35],
				[977, 35],
				[977, 36],
				[978, 36],
				[978, 38],
				[979, 38],
				[979, 39],
				[980, 39],
				[980, 40],
				[982, 41],
				[982, 43],
				[983, 43],
				[983, 45],
				[985, 46],
				[985, 49],
				[986, 49],
				[986, 51],
				[987, 51],
				[987, 56],
				[988, 56],
				[988, 60],
				[989, 60],
				[989, 64],
				[990, 64],
				[990, 69],
				[991, 69],
				[991, 74],
				[992, 74],
				[992, 80],
				[993, 80],
				[993, 86],
				[994, 86],
				[994, 93],
				[995, 93],
				[995, 98],
				[996, 98],
				[997, 114],
				[998, 114],
				[998, 124],
				[999, 124],
				[999, 139],
				[1e3, 139],
				[1e3, 198],
				[999, 198],
				[999, 213],
				[998, 213],
				[998, 223],
				[997, 223],
				[997, 230],
				[996, 230],
				[996, 238],
				[995, 238],
				[995, 243],
				[994, 243],
				[994, 250],
				[993, 250],
				[993, 257],
				[992, 257],
				[992, 262],
				[991, 262],
				[991, 268],
				[990, 268],
				[990, 272],
				[989, 272],
				[988, 280],
				[987, 280],
				[987, 285],
				[986, 285],
				[986, 288],
				[985, 288],
				[984, 292],
				[982, 293],
				[982, 295],
				[980, 296],
				[980, 298],
				[979, 298],
				[979, 299],
				[978, 299],
				[978, 300],
				[977, 300],
				[977, 301],
				[976, 301],
				[975, 303],
				[974, 303],
				[974, 304],
				[972, 304],
				[971, 306],
				[969, 306],
				[969, 307],
				[967, 307],
				[967, 308],
				[965, 308],
				[965, 309],
				[961, 310],
				[961, 311],
				[957, 311],
				[957, 312],
				[955, 312],
				[955, 313],
				[951, 313],
				[951, 314],
				[948, 314],
				[948, 315],
				[944, 315],
				[944, 316],
				[941, 316],
				[941, 317],
				[936, 317],
				[936, 318],
				[932, 318],
				[931, 320],
				[929, 320],
				[929, 321],
				[925, 322],
				[924, 324],
				[922, 324],
				[922, 325],
				[920, 325],
				[920, 326],
				[917, 326],
				[917, 327],
				[915, 327],
				[915, 328],
				[913, 328],
				[913, 329],
				[907, 330],
				[907, 331],
				[904, 331],
				[904, 332],
				[900, 332],
				[900, 333],
				[895, 333],
				[895, 334],
				[889, 334],
				[889, 335],
				[826, 335],
				[826, 336],
				[412, 336],
				[412, 335],
				[406, 335],
				[318, 335],
				[318, 334],
				[307, 334],
				[307, 333],
				[288, 333],
				[288, 332],
				[276, 332],
				[276, 331],
				[262, 331],
				[262, 330],
				[189, 330],
				[189, 329],
				[166, 329],
				[166, 328],
				[153, 328],
				[153, 327],
				[145, 327],
				[145, 326],
				[136, 326],
				[136, 325],
				[131, 325],
				[131, 324],
				[125, 325],
				[125, 324],
				[118, 324],
				[118, 323],
				[115, 323],
				[115, 322],
				[113, 321],
				[113, 316],
				[105, 316],
				[105, 315],
				[103, 315],
				[103, 314],
				[102, 314],
				[102, 313],
				[101, 313],
				[101, 312],
				[99, 311],
				[99, 309],
				[100, 309],
				[100, 308],
				[103, 308],
				[103, 307],
				[95, 307],
				[95, 306],
				[94, 306],
				[94, 305],
				[92, 305],
				[92, 304],
				[91, 304],
				[91, 303],
				[90, 303],
				[89, 301],
				[87, 301],
				[87, 251],
				[99, 251],
				[99, 252],
				[100, 252],
				[100, 251],
				[107, 251],
				[107, 250],
				[101, 249],
				[101, 248],
				[99, 247],
				[99, 245],
				[100, 245],
				[100, 244],
				[103, 244],
				[103, 243],
				[114, 243],
				[114, 225],
				[115, 225],
				[115, 223],
				[119, 223],
				[119, 222],
				[125, 221],
				[125, 220],
				[128, 220],
				[128, 219],
				[134, 218],
				[134, 215],
				[135, 215],
				[135, 211],
				[138, 211],
				[138, 203],
				[137, 203],
				[136, 201],
				[126, 201],
				[126, 200],
				[125, 200],
				[125, 202],
				[124, 202],
				[124, 203],
				[100, 203],
				[100, 204],
				[90, 205],
				[90, 206],
				[84, 206],
				[84, 207],
				[72, 207],
				[72, 208],
				[51, 208],
				[51, 207],
				[39, 207],
				[39, 206],
				[34, 206],
				[34, 205],
				[30, 205],
				[30, 204],
				[28, 204],
				[28, 203],
				[26, 203],
				[26, 202],
				[23, 202],
				[23, 201],
				[21, 201],
				[21, 200],
				[17, 199],
				[17, 198],
				[16, 198],
				[16, 197],
				[15, 197],
				[15, 196],
				[14, 196],
				[14, 195],
				[13, 195],
				[13, 194],
				[12, 194],
				[12, 193],
				[10, 192],
				[10, 191],
				[9, 191],
				[9, 189],
				[7, 188],
				[7, 186],
				[6, 186],
				[6, 185],
				[4, 184],
				[4, 182],
				[3, 182],
				[3, 180],
				[2, 180],
				[2, 178],
				[1, 178],
				[1, 174],
				[0, 174],
				[0, 162],
				[1, 162],
				[1, 158],
				[2, 158],
				[3, 154],
				[5, 153],
				[5, 151],
				[6, 151],
				[6, 150],
				[8, 149],
				[8, 147],
				[9, 147],
				[9, 146],
				[11, 145],
				[11, 143],
				[12, 143],
				[12, 142],
				[13, 142],
				[13, 141],
				[14, 141],
				[15, 139],
				[17, 139],
				[18, 137],
				[20, 137],
				[20, 136],
				[22, 136],
				[22, 135],
				[24, 135],
				[24, 134],
				[28, 133],
				[28, 132],
				[31, 132],
				[31, 131],
				[35, 131],
				[35, 130],
				[42, 130],
				[42, 129],
				[59, 129],
				[59, 128],
				[68, 128],
				[68, 129],
				[80, 129],
				[80, 130],
				[88, 130],
				[88, 131],
				[93, 131],
				[93, 132],
				[99, 132],
				[99, 133],
				[107, 134],
				[107, 135],
				[113, 136],
				[113, 137],
				[119, 138],
				[119, 139],
				[121, 139],
				[121, 140],
				[122, 140],
				[122, 138],
				[123, 138],
				[124, 136],
				[128, 136],
				[128, 135],
				[134, 135],
				[134, 136],
				[135, 136],
				[135, 135],
				[137, 135],
				[137, 134],
				[138, 134],
				[138, 125],
				[135, 125],
				[135, 122],
				[134, 122],
				[134, 118],
				[130, 118],
				[130, 117],
				[124, 116],
				[124, 115],
				[121, 115],
				[121, 114],
				[117, 114],
				[117, 113],
				[115, 113],
				[115, 111],
				[114, 111],
				[114, 27],
				[113, 27],
				[113, 15],
				[114, 15],
				[114, 14],
				[116, 14],
				[116, 13],
				[126, 12],
				[126, 11],
				[128, 11],
				[128, 12],
				[132, 12],
				[132, 11],
				[139, 11],
				[139, 10],
				[147, 10],
				[147, 9],
				[156, 9],
				[156, 8],
				[169, 8],
				[169, 7],
				[250, 7],
				[250, 6],
				[268, 6],
				[268, 5],
				[270, 5],
				[270, 6],
				[277, 6],
				[277, 5],
				[288, 5],
				[288, 4],
				[290, 4],
				[290, 5],
				[293, 5],
				[292, 7],
				[294, 7],
				[294, 6],
				[316, 6],
				[316, 5],
				[319, 5],
				[319, 4],
				[314, 4],
				[314, 3],
				[323, 3],
				[323, 2],
				[330, 2],
				[330, 3],
				[331, 3],
				[331, 2],
				[344, 2],
				[344, 1],
				[480, 1]
			]],
			"legacyLengthIn": [303.57142857142856, 330.9538714991763]
		},
		{
			"id": "evotti-4565",
			"sourceId": "4565",
			"name": "723CL 2027",
			"model": "723CL",
			"year": "2027",
			"series": "700",
			"floorplan": "Convertible Lounge (CL)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "156548",
			"path": "/_cdn/static/layout-evotti-156548.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				656,
				118,
				3577,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2050, 118],
				[2800, 118],
				[2802, 138],
				[2798, 142],
				[3054, 142],
				[3064, 134],
				[3072, 132],
				[3074, 128],
				[3086, 122],
				[3094, 122],
				[3096, 118],
				[3724, 122],
				[3784, 132],
				[3790, 136],
				[3822, 144],
				[3846, 156],
				[3956, 174],
				[3964, 178],
				[3974, 178],
				[4022, 190],
				[4082, 210],
				[4090, 210],
				[4136, 234],
				[4156, 252],
				[4156, 256],
				[4172, 274],
				[4186, 308],
				[4192, 344],
				[4196, 352],
				[4222, 510],
				[4232, 626],
				[4234, 780],
				[4222, 942],
				[4208, 1038],
				[4190, 1128],
				[4180, 1162],
				[4172, 1178],
				[4156, 1196],
				[4156, 1200],
				[4134, 1220],
				[4096, 1240],
				[4076, 1244],
				[4044, 1256],
				[4036, 1256],
				[4030, 1260],
				[3928, 1284],
				[3846, 1296],
				[3838, 1302],
				[3792, 1318],
				[3726, 1330],
				[2714, 1334],
				[1994, 1334],
				[1632, 1332],
				[1506, 1328],
				[996, 1328],
				[992, 1308],
				[898, 1304],
				[818, 1294],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1276],
				[744, 1262],
				[716, 1260],
				[700, 1248],
				[698, 1236],
				[706, 1232],
				[704, 1228],
				[680, 1228],
				[670, 1216],
				[666, 1216],
				[656, 1206],
				[656, 1024],
				[692, 1024],
				[696, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1004],
				[708, 998],
				[752, 998],
				[752, 926],
				[822, 906],
				[826, 900],
				[828, 882],
				[838, 880],
				[838, 852],
				[822, 838],
				[822, 614],
				[838, 600],
				[838, 572],
				[828, 570],
				[826, 552],
				[822, 546],
				[752, 526],
				[752, 216],
				[744, 214],
				[744, 174],
				[748, 170],
				[752, 170],
				[754, 166],
				[774, 162],
				[808, 162],
				[820, 158],
				[900, 148],
				[992, 144],
				[996, 124],
				[1512, 124],
				[1666, 120]
			]],
			"legacyLengthIn": [300.0444078947368],
			"layoutLengthIn": 334,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 27 ft 10 in, including motor."
		},
		{
			"id": "evotti-4561",
			"sourceId": "4561",
			"name": "723CS 2027",
			"model": "723CS",
			"year": "2027",
			"series": "700",
			"floorplan": "Convertible Stern (CS)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "145342",
			"path": "/_cdn/static/layout-evotti-145342.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				293,
				119,
				3939,
				1214
			],
			"imageRotation": -90,
			"imageContours": [[
				[2270, 118],
				[2800, 118],
				[2800, 138],
				[2796, 144],
				[3052, 144],
				[3064, 138],
				[3066, 134],
				[3074, 132],
				[3076, 128],
				[3088, 122],
				[3092, 124],
				[3096, 120],
				[3710, 122],
				[3750, 126],
				[3788, 134],
				[3830, 148],
				[3850, 158],
				[3890, 162],
				[3970, 178],
				[3994, 186],
				[4004, 186],
				[4010, 190],
				[4026, 192],
				[4032, 196],
				[4040, 196],
				[4046, 200],
				[4054, 200],
				[4098, 214],
				[4126, 228],
				[4158, 256],
				[4158, 260],
				[4172, 276],
				[4184, 304],
				[4214, 458],
				[4230, 608],
				[4232, 806],
				[4228, 874],
				[4212, 1008],
				[4196, 1096],
				[4192, 1104],
				[4182, 1154],
				[4160, 1194],
				[4132, 1220],
				[4098, 1238],
				[3970, 1274],
				[3878, 1292],
				[3850, 1294],
				[3830, 1304],
				[3818, 1306],
				[3814, 1310],
				[3772, 1322],
				[3712, 1330],
				[2860, 1334],
				[1832, 1332],
				[1528, 1330],
				[1288, 1314],
				[1236, 1308],
				[964, 1308],
				[870, 1300],
				[812, 1290],
				[792, 1292],
				[756, 1286],
				[754, 1282],
				[746, 1280],
				[746, 1260],
				[722, 1260],
				[710, 1256],
				[698, 1244],
				[698, 1236],
				[700, 1232],
				[706, 1232],
				[706, 1228],
				[682, 1228],
				[656, 1204],
				[656, 1026],
				[692, 1024],
				[700, 1028],
				[704, 1024],
				[722, 1024],
				[702, 1016],
				[698, 1012],
				[698, 1006],
				[704, 1e3],
				[752, 998],
				[754, 926],
				[824, 906],
				[830, 882],
				[838, 882],
				[838, 850],
				[824, 838],
				[824, 810],
				[818, 810],
				[820, 816],
				[812, 818],
				[816, 820],
				[816, 834],
				[810, 840],
				[750, 842],
				[746, 852],
				[670, 850],
				[630, 860],
				[570, 868],
				[466, 868],
				[416, 862],
				[396, 856],
				[384, 848],
				[378, 848],
				[354, 836],
				[348, 828],
				[344, 828],
				[338, 822],
				[338, 818],
				[314, 792],
				[298, 764],
				[294, 748],
				[292, 718],
				[298, 688],
				[304, 676],
				[308, 674],
				[310, 666],
				[328, 646],
				[328, 642],
				[360, 612],
				[380, 606],
				[408, 592],
				[466, 584],
				[568, 584],
				[618, 590],
				[690, 606],
				[738, 624],
				[740, 618],
				[752, 610],
				[804, 610],
				[816, 618],
				[814, 634],
				[818, 636],
				[818, 642],
				[824, 644],
				[824, 614],
				[838, 602],
				[838, 570],
				[830, 570],
				[824, 546],
				[804, 542],
				[780, 532],
				[772, 532],
				[754, 526],
				[752, 522],
				[752, 216],
				[746, 214],
				[746, 172],
				[756, 166],
				[792, 160],
				[812, 162],
				[824, 158],
				[888, 150],
				[966, 144],
				[1238, 144],
				[1372, 132],
				[1536, 122]
			]],
			"legacyLengthIn": [330.9538714991763],
			"layoutLengthIn": 334,
			"dimensionMode": "calibrated",
			"dimensionBasis": "User-provided approximate overall footprint of 27 ft 10 in, including motor."
		},
		{
			"id": "evotti-4560",
			"sourceId": "4560",
			"name": "723QL 2027",
			"model": "723QL",
			"year": "2027",
			"series": "700",
			"floorplan": "Quad Lounge (QL)",
			"widthIn": 102,
			"lengthIn": 276,
			"sourceImageId": "site-723ql",
			"path": "/_cdn/static/layout-evotti-site-723ql.webp",
			"width": 1e3,
			"height": 309,
			"imageRotation": -90,
			"builderSourceImageId": "145343",
			"builderSourceUrl": "https://11092797.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2385&deploy=1&compid=11092797&ns-at=AAEJ7tMQmANnupNoYlyBe144ImbOUypqD-vXVQpQl_kEQ8hzaV0&imageId=145343",
			"sourcePage": "https://evotti.com/700-series/",
			"imageBounds": [
				0,
				0,
				1e3,
				309
			],
			"imageContours": [[
				[446, 0],
				[637, 0],
				[637, 5],
				[636, 5],
				[636, 6],
				[702, 6],
				[703, 4],
				[707, 3],
				[708, 1],
				[712, 1],
				[712, 0],
				[810, 0],
				[810, 1],
				[873, 1],
				[873, 2],
				[880, 2],
				[880, 3],
				[884, 3],
				[884, 4],
				[888, 4],
				[888, 5],
				[892, 5],
				[892, 6],
				[894, 6],
				[894, 7],
				[897, 7],
				[897, 8],
				[899, 8],
				[899, 9],
				[902, 9],
				[902, 10],
				[909, 10],
				[909, 11],
				[915, 11],
				[915, 12],
				[925, 13],
				[925, 14],
				[930, 14],
				[930, 15],
				[934, 15],
				[934, 16],
				[938, 16],
				[938, 17],
				[942, 17],
				[942, 18],
				[946, 18],
				[946, 19],
				[950, 19],
				[950, 20],
				[956, 21],
				[956, 22],
				[960, 22],
				[960, 23],
				[966, 24],
				[966, 25],
				[968, 25],
				[968, 26],
				[972, 27],
				[973, 29],
				[975, 29],
				[975, 30],
				[976, 30],
				[976, 31],
				[977, 31],
				[977, 32],
				[978, 32],
				[978, 33],
				[979, 33],
				[979, 34],
				[980, 34],
				[980, 35],
				[982, 36],
				[982, 37],
				[983, 37],
				[983, 39],
				[984, 39],
				[984, 41],
				[985, 41],
				[985, 43],
				[986, 43],
				[987, 47],
				[988, 47],
				[988, 51],
				[989, 51],
				[989, 56],
				[990, 56],
				[990, 61],
				[991, 61],
				[991, 66],
				[992, 66],
				[992, 70],
				[993, 70],
				[994, 82],
				[995, 82],
				[995, 89],
				[996, 89],
				[996, 98],
				[997, 98],
				[997, 107],
				[998, 107],
				[998, 116],
				[999, 116],
				[999, 128],
				[1e3, 128],
				[1e3, 180],
				[999, 180],
				[999, 192],
				[998, 192],
				[998, 202],
				[997, 202],
				[997, 211],
				[996, 211],
				[996, 220],
				[995, 220],
				[995, 227],
				[994, 227],
				[993, 239],
				[992, 239],
				[992, 244],
				[991, 244],
				[991, 248],
				[990, 248],
				[990, 253],
				[989, 253],
				[989, 258],
				[988, 258],
				[988, 262],
				[987, 262],
				[987, 265],
				[985, 266],
				[985, 268],
				[984, 268],
				[983, 272],
				[982, 272],
				[982, 273],
				[981, 273],
				[981, 274],
				[980, 274],
				[980, 275],
				[979, 275],
				[979, 276],
				[978, 276],
				[978, 277],
				[977, 277],
				[976, 279],
				[975, 279],
				[975, 280],
				[973, 280],
				[972, 282],
				[970, 282],
				[970, 283],
				[968, 283],
				[968, 284],
				[966, 284],
				[966, 285],
				[960, 286],
				[960, 287],
				[957, 287],
				[957, 288],
				[953, 288],
				[953, 289],
				[950, 289],
				[950, 290],
				[946, 290],
				[946, 291],
				[942, 291],
				[942, 292],
				[938, 292],
				[938, 293],
				[934, 293],
				[934, 294],
				[930, 294],
				[930, 295],
				[925, 295],
				[925, 296],
				[915, 297],
				[915, 298],
				[909, 298],
				[909, 299],
				[902, 299],
				[902, 300],
				[900, 300],
				[900, 301],
				[897, 301],
				[897, 302],
				[895, 302],
				[895, 303],
				[891, 303],
				[891, 304],
				[885, 305],
				[885, 306],
				[880, 306],
				[880, 307],
				[874, 307],
				[874, 308],
				[781, 308],
				[781, 309],
				[441, 309],
				[395, 309],
				[395, 308],
				[305, 308],
				[305, 307],
				[290, 307],
				[290, 306],
				[273, 306],
				[273, 305],
				[263, 305],
				[263, 304],
				[248, 304],
				[248, 303],
				[174, 303],
				[174, 302],
				[159, 302],
				[159, 301],
				[148, 301],
				[148, 300],
				[140, 300],
				[140, 299],
				[133, 299],
				[133, 298],
				[129, 298],
				[129, 299],
				[128, 299],
				[128, 298],
				[122, 298],
				[122, 297],
				[117, 297],
				[117, 296],
				[115, 295],
				[115, 291],
				[107, 290],
				[107, 289],
				[106, 289],
				[105, 287],
				[103, 287],
				[103, 284],
				[104, 284],
				[104, 283],
				[106, 283],
				[106, 282],
				[98, 282],
				[98, 281],
				[97, 281],
				[97, 280],
				[96, 280],
				[96, 279],
				[95, 279],
				[95, 278],
				[93, 277],
				[93, 276],
				[92, 276],
				[92, 273],
				[93, 273],
				[93, 234],
				[92, 234],
				[92, 230],
				[102, 230],
				[102, 231],
				[104, 231],
				[104, 230],
				[107, 230],
				[107, 229],
				[103, 228],
				[103, 225],
				[104, 225],
				[104, 224],
				[109, 224],
				[109, 223],
				[117, 223],
				[117, 222],
				[116, 222],
				[116, 209],
				[117, 209],
				[117, 205],
				[120, 205],
				[120, 204],
				[123, 204],
				[123, 203],
				[127, 203],
				[127, 202],
				[133, 201],
				[133, 200],
				[135, 200],
				[136, 194],
				[139, 194],
				[139, 187],
				[138, 187],
				[138, 185],
				[137, 185],
				[137, 184],
				[135, 183],
				[135, 176],
				[134, 176],
				[134, 178],
				[133, 178],
				[133, 183],
				[131, 183],
				[131, 184],
				[127, 184],
				[127, 185],
				[118, 185],
				[118, 184],
				[116, 184],
				[116, 186],
				[115, 186],
				[115, 187],
				[109, 187],
				[109, 186],
				[96, 186],
				[96, 187],
				[86, 188],
				[86, 189],
				[80, 189],
				[80, 190],
				[70, 190],
				[70, 191],
				[45, 191],
				[45, 190],
				[34, 190],
				[34, 189],
				[29, 189],
				[29, 188],
				[26, 188],
				[26, 187],
				[24, 187],
				[24, 186],
				[22, 186],
				[22, 185],
				[18, 184],
				[18, 183],
				[16, 183],
				[16, 182],
				[15, 182],
				[15, 181],
				[14, 181],
				[14, 180],
				[13, 180],
				[13, 179],
				[12, 179],
				[12, 178],
				[11, 178],
				[11, 177],
				[9, 176],
				[9, 175],
				[8, 175],
				[8, 173],
				[7, 173],
				[7, 172],
				[5, 171],
				[5, 169],
				[3, 168],
				[3, 166],
				[2, 166],
				[2, 164],
				[1, 164],
				[1, 160],
				[0, 160],
				[0, 149],
				[1, 149],
				[1, 145],
				[2, 145],
				[3, 141],
				[5, 140],
				[5, 138],
				[6, 138],
				[6, 137],
				[8, 136],
				[8, 134],
				[9, 134],
				[9, 133],
				[10, 133],
				[10, 132],
				[11, 132],
				[11, 131],
				[12, 131],
				[12, 130],
				[13, 130],
				[13, 129],
				[14, 129],
				[15, 127],
				[16, 127],
				[16, 126],
				[18, 126],
				[18, 125],
				[20, 125],
				[20, 124],
				[24, 123],
				[24, 122],
				[27, 122],
				[27, 121],
				[29, 121],
				[29, 120],
				[34, 120],
				[34, 119],
				[43, 119],
				[43, 118],
				[72, 118],
				[72, 119],
				[79, 119],
				[79, 120],
				[86, 120],
				[86, 121],
				[91, 121],
				[91, 122],
				[95, 122],
				[95, 123],
				[99, 123],
				[99, 124],
				[102, 124],
				[102, 125],
				[106, 125],
				[106, 126],
				[109, 126],
				[109, 127],
				[112, 127],
				[112, 128],
				[114, 128],
				[114, 126],
				[116, 126],
				[116, 125],
				[131, 125],
				[131, 126],
				[133, 126],
				[133, 131],
				[135, 130],
				[135, 126],
				[136, 126],
				[136, 125],
				[138, 124],
				[138, 122],
				[139, 122],
				[139, 115],
				[136, 115],
				[135, 109],
				[133, 109],
				[133, 108],
				[130, 108],
				[130, 107],
				[126, 107],
				[126, 106],
				[123, 106],
				[123, 105],
				[120, 105],
				[120, 104],
				[117, 104],
				[117, 101],
				[116, 101],
				[116, 87],
				[117, 87],
				[117, 56],
				[116, 56],
				[116, 34],
				[117, 34],
				[117, 28],
				[116, 28],
				[116, 26],
				[117, 26],
				[117, 25],
				[115, 25],
				[115, 14],
				[116, 14],
				[117, 12],
				[122, 12],
				[122, 11],
				[128, 11],
				[128, 10],
				[129, 10],
				[129, 11],
				[133, 11],
				[133, 10],
				[140, 10],
				[140, 9],
				[148, 9],
				[148, 8],
				[158, 8],
				[158, 7],
				[176, 7],
				[176, 6],
				[249, 6],
				[249, 5],
				[262, 5],
				[262, 4],
				[276, 4],
				[276, 3],
				[290, 3],
				[290, 2],
				[296, 2],
				[296, 3],
				[298, 3],
				[298, 2],
				[312, 2],
				[312, 1],
				[446, 1]
			], [
				[671, 180],
				[672, 180],
				[672, 181],
				[671, 181]
			]],
			"legacyLengthIn": [330.09708737864077, 330.9538714991763]
		},
		{
			"id": "evotti-4566",
			"sourceId": "4566",
			"name": "725CL 2027",
			"model": "725CL",
			"year": "2027",
			"series": "700",
			"floorplan": "Convertible Lounge (CL)",
			"widthIn": 102,
			"lengthIn": 300,
			"sourceImageId": "156549",
			"path": "/_cdn/static/layout-evotti-156549.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				292,
				118,
				3941,
				1216
			],
			"imageRotation": -90,
			"imageContours": [[
				[2050, 118],
				[2802, 118],
				[2816, 120],
				[2816, 132],
				[2894, 134],
				[3066, 134],
				[3080, 120],
				[3096, 118],
				[3724, 122],
				[3784, 132],
				[3790, 136],
				[3822, 144],
				[3846, 156],
				[3956, 174],
				[3964, 178],
				[3974, 178],
				[4022, 190],
				[4056, 202],
				[4064, 202],
				[4100, 214],
				[4128, 228],
				[4142, 242],
				[4146, 242],
				[4172, 274],
				[4186, 308],
				[4208, 414],
				[4224, 528],
				[4234, 672],
				[4234, 780],
				[4228, 884],
				[4216, 988],
				[4194, 1110],
				[4180, 1162],
				[4164, 1190],
				[4156, 1196],
				[4156, 1200],
				[4128, 1224],
				[4096, 1240],
				[4076, 1244],
				[4044, 1256],
				[4036, 1256],
				[4030, 1260],
				[3928, 1284],
				[3846, 1296],
				[3838, 1302],
				[3792, 1318],
				[3726, 1330],
				[3188, 1334],
				[2034, 1334],
				[1632, 1332],
				[1506, 1328],
				[996, 1328],
				[992, 1308],
				[898, 1304],
				[818, 1294],
				[806, 1290],
				[786, 1292],
				[754, 1286],
				[744, 1276],
				[744, 1262],
				[716, 1260],
				[700, 1248],
				[698, 1236],
				[706, 1232],
				[704, 1228],
				[680, 1228],
				[670, 1216],
				[666, 1216],
				[656, 1206],
				[656, 1024],
				[692, 1024],
				[696, 1028],
				[704, 1024],
				[724, 1024],
				[700, 1016],
				[698, 1004],
				[708, 998],
				[752, 998],
				[752, 926],
				[822, 906],
				[826, 900],
				[828, 882],
				[838, 880],
				[838, 852],
				[822, 838],
				[822, 810],
				[820, 818],
				[816, 818],
				[816, 836],
				[812, 840],
				[802, 844],
				[750, 842],
				[750, 848],
				[746, 852],
				[678, 850],
				[612, 864],
				[554, 870],
				[484, 870],
				[420, 864],
				[398, 858],
				[382, 848],
				[358, 840],
				[330, 814],
				[330, 810],
				[310, 788],
				[308, 780],
				[304, 778],
				[298, 766],
				[292, 742],
				[292, 712],
				[294, 698],
				[304, 674],
				[308, 672],
				[316, 656],
				[322, 652],
				[322, 648],
				[330, 642],
				[330, 638],
				[352, 616],
				[366, 608],
				[382, 604],
				[398, 594],
				[422, 588],
				[502, 582],
				[578, 584],
				[654, 596],
				[686, 604],
				[692, 608],
				[700, 608],
				[730, 618],
				[734, 622],
				[740, 622],
				[740, 616],
				[754, 608],
				[800, 608],
				[816, 616],
				[816, 634],
				[820, 634],
				[822, 642],
				[822, 614],
				[838, 600],
				[838, 572],
				[828, 570],
				[824, 548],
				[752, 526],
				[752, 216],
				[744, 214],
				[744, 174],
				[754, 166],
				[788, 160],
				[808, 162],
				[820, 158],
				[900, 148],
				[992, 144],
				[996, 124],
				[1512, 124],
				[1666, 120]
			]],
			"legacyLengthIn": [330.57730263157896],
			"layoutLengthIn": 350,
			"dimensionMode": "calibrated",
			"dimensionBasis": "Approximate 29 ft 2 in overall footprint, based on the verified 25-foot Quad Lounge image at 102-inch beam."
		},
		{
			"id": "evotti-4559",
			"sourceId": "4559",
			"name": "725CS 2027",
			"model": "725CS",
			"year": "2027",
			"series": "700",
			"floorplan": "Convertible Stern (CS)",
			"widthIn": 102,
			"lengthIn": 300,
			"sourceImageId": "145344",
			"path": "/_cdn/static/layout-evotti-145344.webp",
			"width": 4800,
			"height": 1451,
			"imageBounds": [
				293,
				119,
				3939,
				1214
			],
			"imageRotation": -90,
			"imageContours": [[
				[2356, 118],
				[2798, 118],
				[2814, 120],
				[2814, 134],
				[3014, 136],
				[3066, 136],
				[3068, 132],
				[3076, 130],
				[3082, 120],
				[3710, 122],
				[3780, 132],
				[3824, 146],
				[3850, 158],
				[3912, 166],
				[4026, 192],
				[4032, 196],
				[4040, 196],
				[4046, 200],
				[4054, 200],
				[4066, 206],
				[4098, 214],
				[4126, 228],
				[4158, 256],
				[4158, 260],
				[4164, 264],
				[4170, 278],
				[4174, 280],
				[4184, 304],
				[4194, 358],
				[4198, 366],
				[4198, 378],
				[4204, 398],
				[4212, 460],
				[4216, 472],
				[4230, 610],
				[4232, 800],
				[4224, 914],
				[4214, 994],
				[4198, 1074],
				[4198, 1086],
				[4194, 1094],
				[4184, 1148],
				[4172, 1176],
				[4158, 1192],
				[4158, 1196],
				[4132, 1220],
				[4086, 1242],
				[3952, 1278],
				[3864, 1294],
				[3850, 1294],
				[3824, 1306],
				[3812, 1308],
				[3808, 1312],
				[3800, 1312],
				[3780, 1320],
				[3710, 1330],
				[2844, 1334],
				[2236, 1334],
				[1744, 1330],
				[1528, 1330],
				[1316, 1316],
				[1292, 1312],
				[1262, 1312],
				[1238, 1308],
				[964, 1308],
				[854, 1298],
				[812, 1290],
				[792, 1292],
				[756, 1286],
				[754, 1282],
				[746, 1280],
				[746, 1260],
				[722, 1260],
				[710, 1256],
				[698, 1244],
				[698, 1234],
				[702, 1232],
				[700, 1228],
				[680, 1228],
				[656, 1204],
				[656, 1026],
				[674, 1024],
				[694, 1026],
				[702, 1030],
				[702, 1026],
				[712, 1024],
				[740, 1024],
				[714, 1022],
				[702, 1016],
				[698, 1010],
				[700, 1002],
				[716, 998],
				[752, 998],
				[754, 926],
				[824, 906],
				[830, 882],
				[838, 882],
				[836, 848],
				[826, 838],
				[812, 836],
				[804, 842],
				[750, 842],
				[746, 852],
				[672, 850],
				[618, 862],
				[538, 870],
				[466, 868],
				[408, 860],
				[354, 836],
				[328, 810],
				[328, 806],
				[306, 780],
				[296, 758],
				[292, 734],
				[292, 718],
				[298, 688],
				[304, 676],
				[308, 674],
				[310, 666],
				[328, 646],
				[328, 642],
				[360, 612],
				[380, 606],
				[408, 592],
				[466, 584],
				[530, 582],
				[618, 590],
				[690, 606],
				[738, 624],
				[740, 618],
				[752, 610],
				[804, 610],
				[816, 618],
				[816, 636],
				[820, 642],
				[824, 640],
				[824, 614],
				[838, 602],
				[838, 570],
				[830, 570],
				[824, 546],
				[798, 540],
				[774, 530],
				[766, 530],
				[754, 526],
				[752, 522],
				[752, 216],
				[746, 214],
				[746, 172],
				[754, 170],
				[756, 166],
				[792, 160],
				[812, 162],
				[824, 158],
				[888, 150],
				[968, 144],
				[1238, 144],
				[1318, 136],
				[1350, 136],
				[1374, 132],
				[1538, 122]
			]],
			"legacyLengthIn": [330.9538714991763],
			"layoutLengthIn": 350,
			"dimensionMode": "calibrated",
			"dimensionBasis": "Approximate 29 ft 2 in overall footprint, based on the verified 25-foot Quad Lounge image at 102-inch beam."
		},
		{
			"id": "evotti-4558",
			"sourceId": "4558",
			"name": "725QL 2027",
			"model": "725QL",
			"year": "2027",
			"series": "700",
			"floorplan": "Quad Lounge (QL)",
			"widthIn": 102,
			"lengthIn": 300,
			"sourceImageId": "site-725ql",
			"path": "/_cdn/static/layout-evotti-site-725ql.webp",
			"width": 1e3,
			"height": 291,
			"imageRotation": -90,
			"builderSourceImageId": "145345",
			"builderSourceUrl": "https://11092797.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2385&deploy=1&compid=11092797&ns-at=AAEJ7tMQmANnupNoYlyBe144ImbOUypqD-vXVQpQl_kEQ8hzaV0&imageId=145345",
			"sourcePage": "https://evotti.com/700-series/",
			"imageBounds": [
				0,
				0,
				1e3,
				291
			],
			"imageContours": [[
				[364, 0],
				[366, 0],
				[366, 1],
				[367, 1],
				[367, 0],
				[594, 0],
				[594, 5],
				[593, 5],
				[593, 6],
				[654, 6],
				[654, 5],
				[657, 5],
				[658, 3],
				[660, 3],
				[661, 1],
				[664, 1],
				[664, 0],
				[824, 0],
				[824, 1],
				[883, 1],
				[883, 2],
				[889, 2],
				[889, 3],
				[893, 3],
				[893, 4],
				[897, 4],
				[897, 5],
				[901, 5],
				[901, 6],
				[904, 6],
				[904, 7],
				[906, 7],
				[906, 8],
				[910, 9],
				[910, 10],
				[916, 10],
				[916, 11],
				[923, 11],
				[923, 12],
				[928, 12],
				[928, 13],
				[932, 13],
				[932, 14],
				[937, 14],
				[937, 15],
				[941, 15],
				[941, 16],
				[946, 16],
				[946, 17],
				[949, 17],
				[949, 18],
				[953, 18],
				[953, 19],
				[959, 20],
				[959, 21],
				[963, 21],
				[963, 22],
				[966, 22],
				[966, 23],
				[968, 23],
				[968, 24],
				[971, 24],
				[972, 26],
				[976, 27],
				[976, 28],
				[977, 28],
				[977, 29],
				[978, 29],
				[978, 30],
				[979, 30],
				[979, 31],
				[980, 31],
				[980, 32],
				[981, 32],
				[981, 33],
				[983, 34],
				[983, 35],
				[984, 35],
				[985, 39],
				[987, 40],
				[987, 42],
				[988, 42],
				[988, 45],
				[989, 45],
				[989, 50],
				[990, 50],
				[991, 58],
				[992, 58],
				[992, 64],
				[993, 64],
				[993, 69],
				[994, 69],
				[994, 75],
				[995, 75],
				[995, 83],
				[996, 83],
				[996, 88],
				[997, 88],
				[997, 96],
				[998, 96],
				[998, 105],
				[999, 105],
				[999, 117],
				[1e3, 117],
				[1e3, 175],
				[999, 175],
				[999, 187],
				[998, 187],
				[997, 203],
				[996, 203],
				[996, 209],
				[995, 209],
				[995, 216],
				[994, 216],
				[994, 222],
				[993, 222],
				[993, 227],
				[992, 227],
				[992, 233],
				[991, 233],
				[991, 238],
				[990, 238],
				[990, 242],
				[989, 242],
				[989, 247],
				[988, 247],
				[988, 249],
				[987, 249],
				[987, 251],
				[986, 251],
				[985, 255],
				[983, 256],
				[983, 258],
				[982, 258],
				[982, 259],
				[981, 259],
				[981, 260],
				[980, 260],
				[980, 261],
				[978, 262],
				[978, 263],
				[976, 263],
				[975, 265],
				[973, 265],
				[973, 266],
				[971, 266],
				[971, 267],
				[967, 268],
				[967, 269],
				[963, 269],
				[963, 270],
				[957, 271],
				[957, 272],
				[954, 272],
				[954, 273],
				[950, 273],
				[950, 274],
				[947, 274],
				[947, 275],
				[942, 275],
				[942, 276],
				[938, 276],
				[938, 277],
				[934, 277],
				[934, 278],
				[930, 278],
				[930, 279],
				[924, 279],
				[924, 280],
				[912, 281],
				[912, 282],
				[909, 282],
				[909, 283],
				[907, 283],
				[907, 284],
				[904, 284],
				[904, 285],
				[902, 285],
				[902, 286],
				[894, 287],
				[894, 288],
				[891, 288],
				[891, 289],
				[885, 289],
				[885, 290],
				[866, 290],
				[866, 291],
				[549, 291],
				[334, 291],
				[334, 290],
				[272, 290],
				[272, 289],
				[260, 289],
				[260, 288],
				[247, 288],
				[247, 287],
				[232, 287],
				[232, 286],
				[170, 286],
				[170, 285],
				[148, 285],
				[148, 284],
				[135, 284],
				[135, 283],
				[128, 283],
				[128, 282],
				[120, 282],
				[120, 281],
				[109, 281],
				[109, 280],
				[103, 280],
				[103, 279],
				[101, 278],
				[101, 274],
				[93, 274],
				[93, 273],
				[90, 273],
				[90, 272],
				[88, 271],
				[88, 269],
				[87, 269],
				[87, 268],
				[88, 268],
				[88, 267],
				[90, 267],
				[90, 266],
				[82, 266],
				[82, 264],
				[81, 264],
				[81, 263],
				[79, 262],
				[79, 260],
				[78, 260],
				[78, 217],
				[87, 217],
				[87, 218],
				[89, 218],
				[89, 217],
				[92, 217],
				[92, 216],
				[90, 216],
				[90, 215],
				[88, 215],
				[88, 214],
				[87, 214],
				[87, 212],
				[88, 212],
				[88, 211],
				[97, 211],
				[97, 210],
				[101, 210],
				[101, 211],
				[102, 211],
				[102, 195],
				[103, 195],
				[103, 193],
				[107, 193],
				[107, 192],
				[113, 191],
				[113, 190],
				[117, 190],
				[117, 189],
				[119, 189],
				[119, 187],
				[120, 187],
				[120, 184],
				[121, 184],
				[121, 183],
				[123, 183],
				[123, 175],
				[122, 175],
				[122, 174],
				[110, 174],
				[110, 176],
				[98, 176],
				[98, 175],
				[93, 175],
				[93, 176],
				[87, 176],
				[87, 177],
				[83, 177],
				[83, 178],
				[77, 178],
				[77, 179],
				[69, 179],
				[69, 180],
				[40, 180],
				[40, 179],
				[31, 179],
				[31, 178],
				[27, 178],
				[27, 177],
				[25, 177],
				[25, 176],
				[23, 176],
				[23, 175],
				[17, 174],
				[17, 173],
				[16, 173],
				[15, 171],
				[13, 171],
				[13, 170],
				[12, 170],
				[12, 169],
				[10, 168],
				[10, 166],
				[9, 166],
				[9, 165],
				[8, 165],
				[8, 164],
				[6, 163],
				[6, 161],
				[4, 160],
				[4, 158],
				[2, 157],
				[2, 154],
				[1, 154],
				[1, 150],
				[0, 150],
				[0, 141],
				[1, 141],
				[1, 137],
				[2, 137],
				[3, 133],
				[5, 132],
				[5, 130],
				[7, 129],
				[7, 127],
				[8, 127],
				[8, 126],
				[9, 126],
				[9, 125],
				[10, 125],
				[10, 124],
				[11, 124],
				[11, 123],
				[12, 123],
				[12, 122],
				[13, 122],
				[13, 121],
				[14, 121],
				[15, 119],
				[16, 119],
				[16, 118],
				[18, 118],
				[18, 117],
				[21, 117],
				[21, 116],
				[23, 116],
				[23, 115],
				[25, 115],
				[25, 114],
				[28, 114],
				[28, 113],
				[32, 113],
				[32, 112],
				[43, 112],
				[43, 111],
				[66, 111],
				[66, 112],
				[76, 112],
				[76, 113],
				[86, 114],
				[86, 115],
				[91, 115],
				[91, 116],
				[94, 116],
				[94, 117],
				[98, 117],
				[98, 118],
				[104, 119],
				[104, 120],
				[107, 120],
				[107, 121],
				[108, 121],
				[108, 119],
				[110, 119],
				[110, 118],
				[112, 118],
				[112, 117],
				[122, 117],
				[122, 116],
				[123, 116],
				[123, 108],
				[120, 108],
				[120, 104],
				[119, 104],
				[119, 102],
				[116, 102],
				[116, 101],
				[112, 101],
				[112, 100],
				[106, 99],
				[106, 98],
				[103, 98],
				[103, 96],
				[102, 96],
				[102, 23],
				[101, 23],
				[101, 13],
				[102, 13],
				[102, 12],
				[104, 12],
				[104, 11],
				[111, 11],
				[111, 10],
				[115, 10],
				[115, 11],
				[116, 11],
				[116, 10],
				[122, 10],
				[122, 9],
				[129, 9],
				[129, 8],
				[137, 8],
				[137, 7],
				[150, 7],
				[150, 6],
				[222, 6],
				[222, 5],
				[236, 5],
				[236, 4],
				[250, 4],
				[250, 3],
				[265, 3],
				[265, 2],
				[279, 2],
				[279, 1],
				[364, 1]
			]],
			"legacyLengthIn": [330.9538714991763, 350.5154639175258]
		}
	];
	const evottiModel = (id) => EVOTTI_MODELS.find((model) => model.id === id);
	const modelLengthIn = (model) => model.layoutLengthIn ?? model.widthIn * model.imageBounds[2] / model.imageBounds[3];

// layout-migration-source/client/geometry.js
	const EPS = 1e-7;
	// Supplied artwork: 609 × 197 px, rear left, hitch right.
	function trailerSize(o) {
		const width = o.w + 8;
		const extra = width * 115 / 197;
		const length = o.h + extra;
		return { width, length, extra, total: length };
	}
	function localFootprints(o) {
		if (o.kind === "boat" && o.genericBoat && o.trailer) {
			const t = trailerSize(o);
			// Keep wheel clearance beside the boat; taper from full boat beam to hitch.
			const bow = -o.h / 2, hitch = bow - t.extra;
			return [[
				[-t.width/2, o.h/2], [-t.width/2, bow], [-o.w/2, bow],
				[0, hitch], [o.w/2, bow], [t.width/2, bow], [t.width/2, o.h/2]
			]];
		}
		const model = !o.image && (premierModel(o.premierModelId) || evottiModel(o.evottiModelId));
		if (model?.dimensionMode === "published") {
			const [left, top, width, height] = model.imageBounds;
			return model.imageContours.map((contour) => contour.map(([x, y]) => [-(y - top - height / 2) * o.w / height, (x - left - width / 2) * o.h / width]));
		}
		if (model?.dimensionMode === "calibrated") {
			const [left, top, width, height] = model.imageBounds;
			return model.imageContours.map((contour) => contour.map(([x, y]) => [(Math.max(top, Math.min(top + height, y)) - top - height / 2) * o.w / height, -(Math.max(left, Math.min(left + width, x)) - left - width / 2) * o.h / width]));
		}
		if (model?.imageContours) {
			const [left, top, width, height] = model.imageBounds, scale = o.w / height;
			return model.imageContours.map((contour) => contour.map(([x, y]) => [(Math.max(top, Math.min(top + height, y)) - top - height / 2) * scale, -(Math.max(left, Math.min(left + width, x)) - left - width / 2) * scale]));
		}
		if (o.shape === "polygon") return [o.points];
		if (o.kind === "boat" && !o.image && !o.genericBoat) {
			const w = o.w, h = o.h, points = [[-w / 2, h / 2 - 12], [-w / 2, -h / 2 + 30]];
			const curve = (a, b, c) => {
				for (let i = 1; i <= 12; i++) {
					const t = i / 12, u = 1 - t;
					points.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]);
				}
			};
			curve([-w / 2, -h / 2 + 30], [-w / 2, -h / 2], [0, -h / 2]);
			curve([0, -h / 2], [w / 2, -h / 2], [w / 2, -h / 2 + 30]);
			points.push([w / 2, h / 2 - 12]);
			curve([w / 2, h / 2 - 12], [w / 2, h / 2], [w / 2 - 12, h / 2]);
			points.push([-w / 2 + 12, h / 2]);
			curve([-w / 2 + 12, h / 2], [-w / 2, h / 2], [-w / 2, h / 2 - 12]);
			return [points];
		}
		return [[
			[-o.w / 2, -o.h / 2],
			[o.w / 2, -o.h / 2],
			[o.w / 2, o.h / 2],
			[-o.w / 2, o.h / 2]
		]];
	}
	function footprints(o) {
		const a = o.angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
		return localFootprints(o).map((points) => points.map(([x, y]) => ({
			x: o.x + x * c - y * s,
			y: o.y + x * s + y * c
		})));
	}
	function boundary(o, booth) {
		if (o.shape === "circle") return o.x - o.w / 2 < -1e-7 || o.y - o.w / 2 < -1e-7 || o.x + o.w / 2 > booth.w + EPS || o.y + o.w / 2 > booth.h + EPS;
		return footprints(o).some((points) => points.some((p) => p.x < -1e-7 || p.y < -1e-7 || p.x > booth.w + EPS || p.y > booth.h + EPS));
	}
	function cross(a, b, c) {
		return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
	}
	function on(a, b, p) {
		return Math.abs(cross(a, b, p)) < EPS && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
	}
	function inside(p, poly) {
		let hit = false;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const a = poly[j], b = poly[i];
			if (on(a, b, p)) return true;
			if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit;
		}
		return hit;
	}
	function distance(p, a, b) {
		const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
		return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
	}
	function polygonsIntersect(ap, bp) {
		if (ap.some((p) => inside(p, bp)) || bp.some((p) => inside(p, ap))) return true;
		return ap.some((p, i) => bp.some((q, j) => {
			const r = ap[(i + 1) % ap.length], s = bp[(j + 1) % bp.length];
			return on(p, r, q) || on(p, r, s) || on(q, s, p) || on(q, s, r) || cross(p, r, q) * cross(p, r, s) < 0 && cross(q, s, p) * cross(q, s, r) < 0;
		}));
	}
	function intersects(a, b) {
		if (a.shape === "circle" && b.shape === "circle") return Math.hypot(a.x - b.x, a.y - b.y) <= (a.w + b.w) / 2;
		if (a.shape === "circle" || b.shape === "circle") {
			const circle = a.shape === "circle" ? a : b;
			return footprints(a.shape === "circle" ? b : a).some((p) => inside(circle, p) || p.some((v, i) => distance(circle, v, p[(i + 1) % p.length]) <= circle.w / 2));
		}
		const ap = footprints(a), bp = footprints(b);
		return ap.some((p) => bp.some((q) => polygonsIntersect(p, q)));
	}
	function warnings(o, state) {
		const list = [];
		if (o.kind !== "obstacle" && boundary(o, state.booth)) list.push("Crosses booth boundary");
		if (o.kind !== "obstacle" && state.items.some((b) => b.kind === "obstacle" && intersects(o, b))) list.push("Touches or overlaps a facility obstacle");
		return list;
	}
	function validState(s) {
		return s?.version === 1 && validSurroundings(s.surroundings) && validVenue(s.venue) && s.booth && [s.booth.w, s.booth.h].every((v) => Number.isFinite(v) && v > 0 && v <= 12e3) && Array.isArray(s.items) && s.items.length <= 500 && validMovementGroups(s.items) && new Set(s.items.map((o) => o.id)).size === s.items.length && s.items.every((o) => validDockMaterials(o) && (o.genericBoat === void 0 || typeof o.genericBoat === "boolean") && (o.trailer === void 0 || typeof o.trailer === "boolean" && (!o.trailer || o.kind === "boat" && o.genericBoat === true)) && (o.layerIndex === void 0 || Number.isSafeInteger(o.layerIndex) && Math.abs(o.layerIndex) <= 1e6) && (o.showLabel === void 0 || typeof o.showLabel === "boolean") && typeof o.id === "string" && typeof o.label === "string" && [
			"boat",
			"dock",
			"obstacle"
		].includes(o.kind) && [
			"rectangle",
			"circle",
			"polygon"
		].includes(o.shape) && [
			o.x,
			o.y,
			o.w,
			o.h,
			o.angle
		].every(Number.isFinite) && o.w > 0 && o.h > 0 && o.w <= 12e3 && o.h <= 12e3 && (o.kind !== "boat" || (o.genericBoat === true ? !o.premierModelId && !o.evottiModelId : o.premierModelId ? validPremierBoat(o) : o.w === 102)) && (!o.premierModelId || validPremierBoat(o)) && (!o.evottiModelId || o.kind === "boat" && evottiModel(o.evottiModelId) && [
			evottiModel(o.evottiModelId).lengthIn,
			modelLengthIn(evottiModel(o.evottiModelId)),
			...evottiModel(o.evottiModelId).legacyLengthIn || []
		].includes(o.h)) && (o.shape !== "polygon" || Array.isArray(o.points) && o.points.length >= 3 && o.points.length <= 100 && o.points.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) && (!o.evottiColorwayId || o.kind === "boat" && evottiModel(o.evottiModelId) && (o.evottiColorwayId === "original" || evottiColorways(o.evottiModelId).some((c) => c.id === o.evottiColorwayId))) && (!o.image || /^data:image\/(png|jpeg|webp);base64,/.test(o.image)));
	}
	function rescaleCatalogBoats(state) {
		for (const boat of state.items) {
			const model = evottiModel(boat.evottiModelId);
			if (model) {
				boat.w = model.widthIn;
				boat.h = modelLengthIn(model);
			}
		}
		return state;
	}
	function validPremierBoat(o) {
		const model = premierModel(o.premierModelId);
		return !!model && o.kind === "boat" && o.shape === "rectangle" && !o.evottiModelId && model.widthOptions.includes(o.w) && o.h === model.lengthIn;
	}

// layout-migration-source/client/alignment.js
	function alignmentBounds(item) {
		if (item.shape === "circle") return {
			left: item.x - item.w / 2,
			right: item.x + item.w / 2,
			top: item.y - item.w / 2,
			bottom: item.y + item.w / 2
		};
		const points = footprints(item).flat();
		return {
			left: Math.min(...points.map((p) => p.x)),
			right: Math.max(...points.map((p) => p.x)),
			top: Math.min(...points.map((p) => p.y)),
			bottom: Math.max(...points.map((p) => p.y))
		};
	}
	function alignmentPlan(items, ids, mode) {
		if (![
			"left",
			"right",
			"top",
			"bottom",
			"vertical",
			"horizontal"
		].includes(mode)) return { error: "Choose an alignment direction." };
		const chosen = [...new Set(ids)].map((id) => items.find((o) => o.id === id)).filter(Boolean);
		if (chosen.length < 2) return { error: "Select at least two items to align." };
		const groups = /* @__PURE__ */ new Set();
		for (const item of chosen) if (item.groupId) {
			if (groups.has(item.groupId)) return { error: "Select only one reference item per linked group, or unlink the items to align them individually." };
			groups.add(item.groupId);
		}
		const axis = [
			"left",
			"right",
			"vertical"
		].includes(mode) ? "x" : "y";
		const coordinate = (item) => mode === "vertical" ? item.x : mode === "horizontal" ? item.y : alignmentBounds(item)[mode];
		const target = coordinate(chosen[0]), moves = [];
		for (const item of chosen.slice(1)) {
			const delta = target - coordinate(item);
			if (Math.abs(delta) < 1e-7) continue;
			if (movementLocked(items, item.id)) return { error: "Unlock the selected items and their linked groups before aligning. The reference item may stay locked." };
			for (const member of movementMembers(items, item.id)) moves.push({
				id: member.id,
				dx: axis === "x" ? delta : 0,
				dy: axis === "y" ? delta : 0
			});
		}
		return { moves };
	}

// layout-migration-source/client/print-layout.js
	function printMeasure(inches) {
		const n = Math.round(inches * 10) / 10;
		return `${Math.floor(n / 12)}′ ${+(n % 12).toFixed(1)}″`;
	}
	function layoutInventory(state) {
		const boats = state.items.filter((o) => o.kind === "boat").map((o) => ({
			label: o.label || "Unlabeled boat",
			model: o.evottiModelId ? `Evotti ${evottiModel(o.evottiModelId)?.model || ""}` : o.premierModelId ? `Premier ${premierModel(o.premierModelId)?.name || ""}` : "Custom boat",
			dimensions: `${printMeasure(o.w)} × ${printMeasure(o.h)}${o.genericBoat && o.trailer ? `; with trailer ${printMeasure(trailerSize(o).width)} × ${printMeasure(trailerSize(o).total)} (+${printMeasure(trailerSize(o).extra)} length)` : ""}`
		}));
		const types = /* @__PURE__ */ new Map();
		for (const o of state.items.filter((o) => o.kind === "dock")) {
			const triangle = o.shape === "polygon" && o.points.length === 3;
			const [w, h] = o.shape === "rectangle" ? [o.w, o.h].sort((a, b) => a - b) : [o.w, o.h];
			const key = JSON.stringify([
				o.shape,
				w,
				h,
				o.shape === "polygon" ? o.points : []
			]);
			if (!types.has(key)) {
				const nominal = /* @__PURE__ */ new Map([
					[48, "4 × 4"],
					[102, "4 × 8"],
					[126, "4 × 10"],
					[150, "4 × 12"],
					[198, "4 × 16"]
				]);
				const name = triangle ? "RS4 triangle" : o.shape === "rectangle" ? w === 48 ? `RS4 · ${nominal.get(h) || "Section"}` : w === 72 && h === 102 ? "RS4 · 6 × 8" : "Dock section" : "Custom dock";
				types.set(key, {
					name,
					dimensions: `${printMeasure(w)} × ${printMeasure(h)}${triangle ? " legs" : ""}`,
					quantity: 0,
					legs: 0,
					panels: 0,
					triangles: 0,
					unlisted: 0
				});
			}
			const row = types.get(key), decking = dockDecking(o);
			row.quantity++;
			row.legs += dockLegs(o).filter(Boolean).length;
			row.panels += decking.panels;
			row.triangles += decking.triangles;
			row.unlisted += decking.unlisted;
		}
		return {
			boats,
			docks: [...types.values()],
			dockCount: state.items.filter((o) => o.kind === "dock").length,
			materials: dockMaterials(state.items)
		};
	}
	function printBounds(state) {
		const points = state.items.flatMap((o) => o.shape === "circle" ? [{
			x: o.x - o.w / 2,
			y: o.y - o.w / 2
		}, {
			x: o.x + o.w / 2,
			y: o.y + o.w / 2
		}] : footprints(o).flat());
		for (const area of surroundingAreas(state)) points.push({
			x: area.x,
			y: area.y
		}, {
			x: area.x + area.w,
			y: area.y + area.h
		});
		const left = Math.min(0, ...points.map((p) => p.x)), top = Math.min(0, ...points.map((p) => p.y));
		const right = Math.max(state.booth.w, ...points.map((p) => p.x)), bottom = Math.max(state.booth.h, ...points.map((p) => p.y));
		return {
			x: left - 24,
			y: top - 28,
			w: right - left + 36,
			h: bottom - top + 40
		};
	}
	function printOrientation({ w, h }) {
		return Math.min(267.4 / w, 184 / h) > Math.min(203.9 / w, 247 / h) ? "landscape" : "portrait";
	}
	function node(tag, text, parent, className) {
		const n = document.createElement(tag);
		if (text !== void 0) n.textContent = text;
		if (className) n.className = className;
		parent?.append(n);
		return n;
	}
	function table(parent, headers, rows) {
		const t = node("table", void 0, parent), tr = node("tr", void 0, node("thead", void 0, t));
		for (const title of headers) node("th", title, tr);
		const body = node("tbody", void 0, t);
		for (const values of rows) {
			const row = node("tr", void 0, body);
			node("span", void 0, node("td", void 0, row), "paperCheck");
			for (const value of values) node("td", String(value), row);
		}
	}
	function initPrintLayout(snapshot) {
		const dialog = node("dialog", void 0, document.body, "printDialog");
		dialog.id = "printDialog";
		dialog.setAttribute("aria-labelledby", "printTitle");
		const toolbar = node("div", void 0, dialog, "printToolbar");
		node("strong", "Print layout & checklist", toolbar).id = "printTitle";
		const print = node("button", "Print / Save PDF", toolbar);
		print.type = "button";
		print.id = "printReport";
		const close = node("button", "Close", toolbar);
		close.type = "button";
		close.onclick = () => dialog.close();
		const report = node("article", void 0, dialog, "layoutReport");
		const pageStyle = node("style", void 0, document.head);
		function prepare() {
			const { state, svg } = snapshot(), inventory = layoutInventory(state), date = (/* @__PURE__ */ new Date()).toLocaleDateString();
			report.replaceChildren();
			const page = node("section", void 0, report, "layoutPrintPage"), heading = node("div", void 0, page, "reportHeading");
			const logo = node("img", void 0, heading);
			logo.src = state.venue?.logo || "/_cdn/static/marine-ops-technology-light-web.svg";
			logo.alt = state.venue?.name || "Marine Ops Technology";
			if (!state.venue?.logo) logo.className = "reportBrandLogo";
			const title = node("div", void 0, heading);
			node("h1", state.venue?.name || "Boat show layout", title);
			node("p", `Layout checklist · ${date}`, title);
			node("p", `${printMeasure(state.booth.w)} × ${printMeasure(state.booth.h)} booth · ${inventory.boats.length} boats · ${inventory.dockCount} dock sections`, page, "reportSummary");
			const [, , w, h] = svg.getAttribute("viewBox").split(/\s+/).map(Number);
			const orientation = printOrientation({
				w,
				h
			});
			page.classList.add(orientation);
			pageStyle.textContent = `@page{size:letter ${orientation};margin:6mm}`;
			svg.removeAttribute("id");
			svg.classList.add("reportDiagram");
			svg.setAttribute("aria-label", "Complete layout");
			for (const image of svg.querySelectorAll("image[data-print-src]")) image.setAttribute("href", image.getAttribute("data-print-src"));
			const ids = new Map([...svg.querySelectorAll("[id]")].map((n) => [n.id, `print-${n.id}`]));
			for (const n of [svg, ...svg.querySelectorAll("*")]) for (const a of [...n.attributes]) if (a.name === "id") n.id = ids.get(a.value);
			else {
				let value = a.value;
				for (const [id, replacement] of ids) value = value.replaceAll(`url(#${id})`, `url(#${replacement})`);
				if (a.value.startsWith("#") && ids.has(a.value.slice(1))) value = "#" + ids.get(a.value.slice(1));
				if (value !== a.value) n.setAttribute(a.name, value);
			}
			page.append(svg);
			node("p", "Planning reference · diagram fits the page and is not a measured print scale.", page, "reportNote");
			const lists = node("section", void 0, report, "checklistPrintPage"), listHeading = node("div", void 0, lists, "checklistHeading");
			node("h2", "Layout checklist", listHeading);
			node("p", state.venue?.name || "Boat show layout", listHeading, "reportSummary");
			const columns = node("div", void 0, lists, "checklistColumns"), boats = node("section", void 0, columns, "boatChecklist"), docks = node("section", void 0, columns, "dockChecklist");
			node("h3", `Boats (${inventory.boats.length})`, boats);
			if (inventory.boats.length) table(boats, [
				"Check",
				"Boat / identifier",
				"Model / layout",
				"Width × length"
			], inventory.boats.map((b) => [
				b.label,
				b.model,
				b.dimensions
			]));
			else node("p", "No boats in this layout.", boats);
			node("h3", `Dock sections (${inventory.dockCount})`, docks);
			if (inventory.docks.length) table(docks, [
				"Check",
				"Section type",
				"Dimensions",
				"Qty",
				"Legs",
				"Decking"
			], inventory.docks.map((d) => [
				d.name,
				d.dimensions,
				d.quantity,
				d.legs,
				d.unlisted ? "Not counted" : d.triangles ? `${d.triangles} triangle ${d.triangles === 1 ? "piece" : "pieces"}` : `${d.panels} panels`
			]));
			else node("p", "No dock sections in this layout.", docks);
			if (inventory.dockCount) {
				node("h3", "Dock materials checklist", docks);
				table(docks, [
					"Check",
					"Material",
					"Total"
				], [
					["Dock legs", inventory.materials.legs],
					["Decking panels (2′ sections)", inventory.materials.panels],
					["Triangle decking pieces", inventory.materials.triangles]
				]);
				node("p", "Filled blue corner squares indicate legs. Joined corners count separately; toggle off any leg that is not needed. Decking uses nominal section lengths.", docks, "reportNote");
				if (inventory.materials.unlisted) node("p", `${inventory.materials.unlisted} custom dock sections have no decking allowance; verify their decking separately.`, docks, "reportNote");
			}
			node("p", "Checked by: __________________________    Date: __________________", lists, "reportSignoff");
		}
		document.getElementById("printLayout").onclick = () => {
			prepare();
			dialog.showModal();
		};
		const status = node("p", void 0, toolbar, "printStatus");
		status.setAttribute("role", "status");
		print.onclick = async () => {
			print.disabled = true;
			status.textContent = "Loading boat images…";
			try {
				const images = [...report.querySelectorAll("img")];
				for (const source of report.querySelectorAll("image")) {
					const image = new Image();
					image.src = source.getAttribute("href");
					images.push(image);
				}
				await Promise.all(images.map((img) => img.decode()));
				status.textContent = "";
				window.print();
			} catch {
				status.textContent = "An image could not load. Reload the layout and try printing again.";
			} finally {
				print.disabled = false;
			}
		};
		window.addEventListener("beforeprint", () => {
			if (!dialog.open) prepare();
		});
	}

// layout-migration-source/client/catalog-ui.js
	const NS$1 = "http://www.w3.org/2000/svg";
	const imageDownloads = /* @__PURE__ */ new Map();
	function imageSource(path) {
		if (!imageDownloads.has(path)) imageDownloads.set(path, fetch(path).then(async (response) => {
			if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw Error("Image unavailable; sign in and try again.");
			return URL.createObjectURL(await response.blob());
		}).catch((error) => {
			imageDownloads.delete(path);
			throw error;
		}));
		return imageDownloads.get(path);
	}
	function imageFrame(model, widthIn, lengthIn, upright = true) {
		if (model.dimensionMode === "calibrated") lengthIn = modelLengthIn(model);
		else if (model.dimensionMode !== "published") lengthIn = widthIn * model.imageBounds[2] / model.imageBounds[3];
		return {
			x: -lengthIn / 2,
			y: -widthIn / 2,
			width: lengthIn,
			height: widthIn,
			viewBox: model.imageBounds.join(" "),
			preserveAspectRatio: ["published", "calibrated"].includes(model.dimensionMode) ? "none" : "xMidYMid meet",
			...upright ? { transform: `rotate(${model.imageRotation ?? -90})` } : {}
		};
	}
	function drawModelImage(parent, model, widthIn, lengthIn, upright = true, colorwayId) {
		const frame = document.createElementNS(NS$1, "svg");
		for (const [key, value] of Object.entries(imageFrame(model, widthIn, lengthIn, upright))) frame.setAttribute(key, value);
		frame.setAttribute("overflow", "hidden");
		frame.setAttribute("pointer-events", "none");
		const variant = evottiColorway(model.id, (model.id === "evotti-4562" || model.id === "evotti-4558") && colorwayId === void 0 ? "original" : colorwayId);
		if (variant?.imageBounds) {
			frame.setAttribute("viewBox", variant.imageBounds.join(" "));
			frame.setAttribute("preserveAspectRatio", "none");
		}
		parent.append(frame);
		for (const path of variant?.layers || [variant?.path || model.path]) {
			const image = document.createElementNS(NS$1, "image");
			image.setAttribute("data-print-src", path);
			for (const [key, value] of Object.entries({
				width: variant?.imageBounds ? variant.width : model.width,
				height: variant?.imageBounds ? variant.height : model.height,
				preserveAspectRatio: "none"
			})) image.setAttribute(key, value);
			frame.append(image);
			imageSource(path).then((url) => image.setAttribute("href", url)).catch(() => {
				const title = document.createElementNS(NS$1, "title");
				title.textContent = "Model image unavailable. Reload to retry.";
				frame.append(title);
			});
		}
	}
	function modelBoat(modelId, label, x, y, colorwayId) {
		const model = evottiModel(modelId);
		if (!model) throw Error("Choose an available Evotti model.");
		const colorway = evottiColorway(modelId, colorwayId);
		return {
			...colorway ? { evottiColorwayId: colorway.id } : colorwayId === "original" ? { evottiColorwayId: "original" } : {},
			id: crypto.randomUUID(),
			kind: "boat",
			label: label.trim() || `${model.model} ${model.lengthIn / 12}'`,
			x,
			y,
			w: model.widthIn,
			h: modelLengthIn(model),
			angle: 0,
			shape: "rectangle",
			locked: false,
			evottiModelId: model.id
		};
	}
	function initCatalog(onAdd) {
		const $ = (id) => document.getElementById(id);
		let selectedId = EVOTTI_MODELS.find((m) => m.model === "725CS")?.id || EVOTTI_MODELS[0].id;
		const dialog = $("evottiDialog");
		function preview() {
			const model = evottiModel(selectedId);
			const scaledLength = modelLengthIn(model);
			const roundedLength = Math.round(scaledLength);
			const lengthLabel = `${Math.floor(roundedLength / 12)}′${roundedLength % 12}″`;
			$("modelPreviewName").textContent = `Evotti ${model.name}`;
			$("modelPreviewDetails").textContent = `${model.series} series · ${model.floorplan} · ${lengthLabel} × 8′6″ ${model.dimensionMode === "calibrated" ? "approximate model footprint" : "overall image footprint"} (including motor) · ${model.lengthIn / 12} ft nominal`;
			$("modelPreviewCanvas").replaceChildren();
			$("modelPreviewCanvas").setAttribute("viewBox", `${-scaledLength / 2 - 8} ${-model.widthIn / 2 - 8} ${scaledLength + 16} ${model.widthIn + 16}`);
			const colors = evottiColorways(model.id);
			$("evottiColorwayField").hidden = !colors.length;
			$("evottiColorway").replaceChildren();
			if (colors.length) {
				for (const color of [{
					id: "original",
					name: "Original manufacturer image"
				}, ...colors]) {
					const option = document.createElement("option");
					option.value = color.id;
					option.textContent = color.name;
					$("evottiColorway").append(option);
				}
				$("evottiColorway").value = evottiColorway(model.id)?.id || "original";
			}
			drawModelImage($("modelPreviewCanvas"), model, model.widthIn, scaledLength, false, $("evottiColorway").value);
			const shared = EVOTTI_MODELS.filter((m) => m.sourceImageId === model.sourceImageId);
			$("sharedImageNote").textContent = model.id === "evotti-4558" ? "All four official upholstery colors and both flooring colors are available. Color previews use official 700 QL artwork shared across sizes, scaled to the 725QL footprint. Original manufacturer image keeps the size-specific 25-foot drawing. Colors do not change dimensions or collision warnings." : model.id === "evotti-4562" ? "Color previews use official artwork shared across the 700 QL sizes, scaled to this model’s existing footprint. Original manufacturer image keeps the size-specific 21-foot drawing. Color choices do not change dimensions or collision warnings." : model.dimensionMode === "calibrated" ? "The manufacturer artwork is calibrated lengthwise to the approximate overall footprint for this model size. Width remains 102 inches; image and warning outline use the same dimensions." : shared.length > 1 ? `Evotti publishes this same image for ${shared.map((m) => m.model).join(", ")}. These models have the same scaled footprint because they share an image.` : "Original Evotti overhead layout. Scaled proportionally to a 102-inch beam; transparent margins are excluded and the motor is included.";
			$("addEvottiModel").textContent = `Add ${model.model} to the floor`;
		}
		function list() {
			const query = $("catalogSearch").value.trim().toLowerCase();
			const series = $("catalogSeries").value, length = $("catalogLength").value;
			const matches = EVOTTI_MODELS.filter((m) => (!series || m.series === series) && (!length || m.lengthIn === Number(length) * 12) && `${m.name} ${m.floorplan}`.toLowerCase().includes(query));
			$("catalogResults").textContent = `${matches.length} of ${EVOTTI_MODELS.length} models`;
			$("modelChoices").replaceChildren();
			for (const model of matches) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "modelChoice";
				button.classList.toggle("active", model.id === selectedId);
				button.setAttribute("aria-pressed", String(model.id === selectedId));
				const name = document.createElement("strong");
				name.textContent = `${model.model} · ${model.lengthIn / 12}′`;
				const detail = document.createElement("span");
				detail.textContent = `${model.floorplan} / ${model.year}`;
				button.append(name, detail);
				button.onclick = () => {
					selectedId = model.id;
					list();
					preview();
				};
				$("modelChoices").append(button);
			}
			if (!matches.length) $("modelChoices").textContent = "No models match these filters.";
		}
		for (const id of [
			"catalogSearch",
			"catalogSeries",
			"catalogLength"
		]) $(id).addEventListener("input", list);
		$("evottiColorway").onchange = () => {
			const model = evottiModel(selectedId);
			$("modelPreviewCanvas").replaceChildren();
			drawModelImage($("modelPreviewCanvas"), model, model.widthIn, modelLengthIn(model), false, $("evottiColorway").value);
		};
		$("browseEvotti").onclick = () => {
			list();
			preview();
			dialog.showModal();
		};
		$("closeEvotti").onclick = () => dialog.close();
		$("addEvottiModel").onclick = () => {
			onAdd(selectedId, $("evottiColorway").value || void 0);
			dialog.close();
		};
		return { isOpen: () => dialog.open };
	}

// layout-migration-source/client/premier-ui.js
	const measure$1 = (value) => `${Math.floor(value / 12)}′${value % 12}″`;
	function premierBoat(id, width, x, y) {
		const model = premierModel(id);
		if (!model || !model.widthOptions.includes(width)) throw Error("Choose a published Premier model and beam.");
		return {
			id: crypto.randomUUID(),
			kind: "boat",
			label: model.name + (model.widthOptions.length > 1 ? ` · ${measure$1(width)} beam` : ""),
			x,
			y,
			w: width,
			h: model.lengthIn,
			angle: 0,
			shape: "rectangle",
			locked: false,
			premierModelId: model.id
		};
	}
	function initPremierCatalog(onAdd) {
		const $ = (id) => document.getElementById(id), dialog = $("premierDialog");
		let selectedId = null;
		for (const family of [...new Set(PREMIER_MODELS.map((m) => m.family))]) {
			const option = document.createElement("option");
			option.value = family;
			option.textContent = family;
			$("premierFamily").append(option);
		}
		function clearPreview(message) {
			selectedId = null;
			$("premierPreview").removeAttribute("data-ready");
			$("premierSelectionHint").hidden = false;
			$("premierSelectionHint").textContent = message;
			$("premierCanvas").replaceChildren();
			$("premierWidth").replaceChildren();
			$("premierWidth").disabled = true;
			$("addPremierModel").disabled = true;
		}
		function draw() {
			const model = premierModel(selectedId);
			if (!model) return;
			const width = Number($("premierWidth").value);
			$("premierCanvas").replaceChildren();
			$("premierCanvas").setAttribute("viewBox", `${-model.lengthIn / 2 - 8} ${-width / 2 - 8} ${model.lengthIn + 16} ${width + 16}`);
			drawModelImage($("premierCanvas"), model, width, model.lengthIn, false);
			$("premierDimensions").textContent = `Published length ${measure$1(model.lengthIn)} × beam ${measure$1(width)}`;
		}
		function preview() {
			const model = premierModel(selectedId);
			if (!model) return;
			$("premierPreview").setAttribute("data-ready", "true");
			$("premierSelectionHint").hidden = true;
			$("premierName").textContent = model.name;
			$("premierDescription").textContent = model.description;
			const shared = PREMIER_MODELS.filter((m) => m.path === model.path);
			$("premierNote").textContent = (model.drawingNote ? model.drawingNote + " " : "") + (shared.length > 1 ? "Premier shares this drawing across " + shared.map((m) => m.name).join(", ") + ". " : "") + "Uses the dimensions published with this floorplan. Outboard clearance is not separately measured.";
			$("premierSource").href = model.sourcePage;
			$("premierWidth").replaceChildren();
			for (const width of model.widthOptions) {
				const option = document.createElement("option");
				option.value = width;
				option.textContent = measure$1(width);
				$("premierWidth").append(option);
			}
			$("premierWidth").disabled = model.widthOptions.length === 1;
			draw();
			$("addPremierModel").disabled = false;
		}
		function list() {
			const family = $("premierFamily").value, size = Number($("premierSize").value), ready = !!family && !!size, query = $("premierSearch").value.trim().toLowerCase();
			$("premierSearch").disabled = !ready;
			$("premierChoices").replaceChildren();
			if (!ready) {
				$("premierResults").textContent = family ? "Choose a size to see available layouts." : "Choose a series to begin.";
				clearPreview(family ? "Choose a size, then a model/layout." : "Choose a series, then a size and model/layout.");
				return;
			}
			const matches = PREMIER_MODELS.filter((m) => m.family === family && m.nominalLengthFt === size && `${m.name} ${m.description}`.toLowerCase().includes(query));
			if (!matches.some((m) => m.id === selectedId)) clearPreview(matches.length ? "Choose a model/layout to preview its floorplan." : "No layouts match. Try another search.");
			$("premierResults").textContent = `${matches.length} layouts · ${family} · ${size} ft model class`;
			for (const model of matches) {
				const button = document.createElement("button");
				button.type = "button";
				button.className = "modelChoice";
				button.classList.toggle("active", model.id === selectedId);
				button.setAttribute("aria-pressed", String(model.id === selectedId));
				const title = document.createElement("strong"), details = document.createElement("span");
				title.textContent = model.name;
				details.textContent = `${measure$1(model.lengthIn)} long · ${model.widthOptions.map(measure$1).join(" / ")} beam`;
				button.append(title, details);
				button.onclick = () => {
					selectedId = model.id;
					list();
					preview();
				};
				$("premierChoices").append(button);
			}
			if (!matches.length) $("premierChoices").textContent = "No floorplans match this search.";
		}
		$("premierFamily").onchange = () => {
			const family = $("premierFamily").value;
			$("premierSize").replaceChildren();
			const placeholder = document.createElement("option");
			placeholder.value = "";
			placeholder.textContent = family ? "Choose size" : "Choose series first";
			$("premierSize").append(placeholder);
			for (const size of [...new Set(PREMIER_MODELS.filter((m) => m.family === family).map((m) => m.nominalLengthFt))].sort((a, b) => a - b)) {
				const option = document.createElement("option");
				option.value = size;
				option.textContent = size + " ft";
				$("premierSize").append(option);
			}
			$("premierSize").disabled = !family;
			$("premierSearch").value = "";
			clearPreview("Choose a size, then a model/layout.");
			list();
		};
		$("premierSize").onchange = () => {
			$("premierSearch").value = "";
			clearPreview("Choose a model/layout to preview its floorplan.");
			list();
		};
		$("premierSearch").oninput = list;
		$("premierWidth").onchange = draw;
		$("browsePremier").onclick = () => {
			list();
			dialog.showModal();
		};
		$("closePremier").onclick = () => dialog.close();
		$("addPremierModel").onclick = () => {
			if (!selectedId) return;
			onAdd(selectedId, Number($("premierWidth").value));
			dialog.close();
		};
		list();
		return { isOpen: () => dialog.open };
	}

// layout-migration-source/client/canvas-display.js
	function displaySettings(value = {}) {
		const input = value && typeof value === "object" ? value : {};
		return {
			showGrid: typeof input.showGrid === "boolean" ? input.showGrid : true,
			spacingIn: [
				12,
				24,
				60,
				120
			].includes(input.spacingIn) ? input.spacingIn : 12,
			style: ["lines", "dots"].includes(input.style) ? input.style : "lines",
			color: typeof input.color === "string" && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : "#9ab0bc",
			opacity: Number.isFinite(input.opacity) && input.opacity >= .1 && input.opacity <= 1 ? input.opacity : .35,
			guides: typeof input.guides === "boolean" ? input.guides : false
		};
	}

// layout-migration-source/client/app.js
	const $ = (id) => document.getElementById(id);
	const NS = "http://www.w3.org/2000/svg";
	const KEY = "lvm-show-layout-v1";
	const item = (kind, label, x, y, w, h, extra = {}) => ({
		id: crypto.randomUUID(),
		kind,
		label,
		x,
		y,
		w,
		h,
		angle: 0,
		shape: "rectangle",
		locked: false,
		...extra
	});
	let state = {
		version: 1,
		booth: {
			w: 720,
			h: 480
		},
		labels: true,
		items: []
	};
	let selectedIds = /* @__PURE__ */ new Set();
	let selected = null;
	let history = [];
	let view = {
		x: -100,
		y: -90,
		w: 920,
		h: 660
	};
	let drawing = null;
	let drag = null;
	function toast(message) {
		$("toast").textContent = message;
		$("toast").hidden = false;
		clearTimeout(toast.timer);
		toast.timer = setTimeout(() => $("toast").hidden = true, 4500);
	}
let previousDraft=null;
try {const saved=JSON.parse(localStorage.getItem(KEY));const recovery=JSON.parse(localStorage.getItem('mot-demo-layout-recovery-v1'));previousDraft=validState(saved)&&saved.items.length?saved:validState(recovery)?recovery:null;if(previousDraft)localStorage.setItem('mot-demo-layout-recovery-v1',JSON.stringify(previousDraft));}catch{toast('Browser storage unavailable. Export layouts to keep a copy.');}
	function checkpoint(snapshot = JSON.stringify(state)) {
		history.push(snapshot);
		if (history.length > 60) history.shift();
		$("undo").disabled = false;
	}
	function save() {
options.onChange?.(structuredClone(state));
		try {
			localStorage.setItem(KEY, JSON.stringify(state));
			$("saveStatus").textContent = "Draft in this browser";
		} catch {
			$("saveStatus").textContent = "Export to save";
			toast("Browser storage is full or unavailable. Export your layout to keep it.");
		}
	}
	function el(tag, attrs = {}, parent) {
		const n = document.createElementNS(NS, tag);
		for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
		parent?.append(n);
		return n;
	}
	function text(parent, value, attrs) {
		const n = el("text", attrs, parent);
		n.textContent = value;
		return n;
	}
	function ft(n) {
		return +(n / 12).toFixed(4);
	}
	function measure(n) {
		const v = Math.round(n * 10) / 10;
		return `${Math.floor(v / 12)}′ ${+(v % 12).toFixed(1)}″`;
	}
	function point(e) {
		return new DOMPoint(e.clientX, e.clientY).matrixTransform($("canvas").getScreenCTM().inverse());
	}
	function current() {
		return state.items.find((o) => o.id === selected);
	}
	function fit() {
		const box = $("canvasWrap").getBoundingClientRect(), r = box.width / box.height;
		const bounds = surroundingBounds(state);
		let w = bounds.w + 160, h = bounds.h + 160;
		if (w / h < r) w = h * r;
		else h = w / r;
		view = {
			x: bounds.x + (bounds.w - w) / 2,
			y: bounds.y + (bounds.h - h) / 2,
			w,
			h
		};
		render();
	}
	function zoom(f) {
		const w = view.w * f, h = view.h * f;
		if (w < 120 || w > 4e4) return;
		view = {
			x: view.x + (view.w - w) / 2,
			y: view.y + (view.h - h) / 2,
			w,
			h
		};
		render();
	}
	function drawBoat(g, o) {
		const w = o.w, h = o.h;
		el("path", {
			d: `M ${-w / 2} ${h / 2 - 12} L ${-w / 2} ${-h / 2 + 30} Q ${-w / 2} ${-h / 2} 0 ${-h / 2} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + 30} L ${w / 2} ${h / 2 - 12} Q ${w / 2} ${h / 2} ${w / 2 - 12} ${h / 2} H ${-w / 2 + 12} Q ${-w / 2} ${h / 2} ${-w / 2} ${h / 2 - 12}`,
			fill: "#d5e3e9",
			stroke: "#46758a",
			"stroke-width": 2
		}, g);
		el("rect", {
			x: -w / 2 + 9,
			y: -h / 2 + 24,
			width: w - 18,
			height: h - 48,
			rx: 12,
			fill: "#eef3f5",
			stroke: "#97b1bd"
		}, g);
		for (const y of [-h / 2 + 34, h / 2 - 70]) {
			for (const x of [-w / 2 + 13, w / 2 - 29]) el("rect", {
				x,
				y,
				width: 16,
				height: 48,
				rx: 5,
				fill: "#b7cad3",
				stroke: "#7896a5"
			}, g);
			el("rect", {
				x: -w / 2 + 15,
				y: y === -h / 2 + 34 ? y : y + 30,
				width: w - 30,
				height: 17,
				rx: 5,
				fill: "#b7cad3",
				stroke: "#7896a5"
			}, g);
		}
		el("rect", {
			x: w / 2 - 32,
			y: 0,
			width: 19,
			height: 32,
			rx: 4,
			fill: "#607f90"
		}, g);
		el("circle", {
			cx: w / 2 - 22,
			cy: 13,
			r: 6,
			fill: "none",
			stroke: "#dce6eb",
			"stroke-width": 2
		}, g);
		el("rect", {
			x: -w / 2 + 13,
			y: 7,
			width: 18,
			height: 36,
			rx: 4,
			fill: "#b7cad3",
			stroke: "#7896a5"
		}, g);
		el("path", {
			d: `M -12 ${-h / 2 + 10} H 12 M 0 ${-h / 2 + 3} V ${-h / 2 + 17}`,
			stroke: "#7092a3",
			"stroke-width": 2
		}, g);
	}
	function drawDock(g, o, defs, clipId) {
		const attrs = {
			fill: "#cfb98d",
			stroke: "#9c814e",
			"stroke-width": 2
		};
		let planks = g;
		if (o.shape === "polygon") {
			const points = o.points.map((p) => p.join(",")).join(" ");
			el("polygon", {
				points,
				...attrs
			}, g);
			const clip = el("clipPath", {
				id: clipId,
				clipPathUnits: "userSpaceOnUse"
			}, defs);
			el("polygon", { points }, clip);
			planks = el("g", {
				"clip-path": `url(#${clipId})`,
				"pointer-events": "none"
			}, g);
		} else el("rect", {
			x: -o.w / 2,
			y: -o.h / 2,
			width: o.w,
			height: o.h,
			...attrs
		}, g);
		for (let y = -o.h / 2 + 12; y < o.h / 2; y += 12) el("line", {
			x1: -o.w / 2 + 4,
			y1: y,
			x2: o.w / 2 - 4,
			y2: y,
			stroke: "#b49a67",
			"stroke-width": 1
		}, planks);
	}
	function layeredItems() {
		return [...state.items.filter((o) => o.kind === "obstacle"), ...state.items.filter((o) => o.kind !== "obstacle")].map((item, index) => ({
			item,
			index: item.layerIndex ?? index
		})).sort((a, b) => a.index - b.index).map((entry) => entry.item);
	}
	function changeLayer(front) {
		const o = current();
		if (!o) return;
		const order = layeredItems(), index = order.indexOf(o);
		if (index === (front ? order.length - 1 : 0)) return;
		checkpoint();
		order.splice(index, 1);
		if (front) order.push(o);
		else order.unshift(o);
		order.forEach((item, i) => item.layerIndex = i);
		save();
		inspector();
		render();
	}
	function render() {
		syncSelection();
		syncAlignmentControls();
		const svg = $("canvas");
		svg.replaceChildren();
		svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
		const display = displaySettings(state.display), step = display.spacingIn;
		const defs = el("defs", {}, svg), grid = el("pattern", {
			id: "grid",
			width: step,
			height: step,
			patternUnits: "userSpaceOnUse"
		}, defs);
		if (display.style === "dots") el("circle", {
			cx: step / 2,
			cy: step / 2,
			r: 1,
			fill: display.color,
			opacity: display.opacity
		}, grid);
		else el("path", {
			d: `M ${step} 0 H 0 V ${step}`,
			fill: "none",
			stroke: display.color,
			opacity: display.opacity,
			"stroke-width": .75
		}, grid);
		const hatch = el("pattern", {
			id: "hatch",
			width: 8,
			height: 8,
			patternUnits: "userSpaceOnUse",
			patternTransform: "rotate(45)"
		}, defs);
		el("rect", {
			width: 8,
			height: 8,
			fill: "#e2e6e8"
		}, hatch);
		el("line", {
			x1: 0,
			y1: 0,
			x2: 0,
			y2: 8,
			stroke: "#a9b4bb",
			"stroke-width": 2
		}, hatch);
		drawSurroundings(svg);
		el("rect", {
			x: 0,
			y: 0,
			width: state.booth.w,
			height: state.booth.h,
			fill: "#fff",
			stroke: "var(--layout-border,#001548)",
			"stroke-width": 2
		}, svg);
		if (display.showGrid) el("rect", {
			"data-grid": "true",
			x: 0,
			y: 0,
			width: state.booth.w,
			height: state.booth.h,
			fill: "url(#grid)",
			"pointer-events": "none"
		}, svg);
		const labelSize = Math.max(8, view.w / $("canvasWrap").clientWidth * 11);
		drawGuides(svg, defs, display);
		const linkedSelection = new Set([...selectedIds].flatMap((id) => movementMembers(state.items, id).map((o) => o.id)));
		const ordered = layeredItems(), itemGroups = /* @__PURE__ */ new Map();
		for (const o of ordered) {
			const ws = warnings(o, state), g = el("g", {
				"data-id": o.id,
				class: "itemShape",
				transform: `translate(${o.x} ${o.y}) rotate(${o.angle})`
			}, svg);
			itemGroups.set(o.id, g);
			el("title", {}, g).textContent = `${o.label} · ${measure(o.w)} × ${measure(o.h)}${ws.length ? " · " + ws.join("; ") : ""}`;
			if (o.kind === "boat") for (const points of localFootprints(o)) el("polygon", {
				"data-item-hit": "true",
				points: points.map((p) => p.join(",")).join(" "),
				fill: "transparent",
				"pointer-events": "all"
			}, g);
			if (o.kind === "dock") drawDock(g, o, defs, `dock-clip-${ordered.indexOf(o)}`);
			else if (o.shape === "circle") el("circle", {
				r: o.w / 2,
				fill: "url(#hatch)",
				stroke: "#7f8c95",
				"stroke-width": 2
			}, g);
			else if (o.shape === "polygon") el("polygon", {
				points: o.points.map((p) => p.join(",")).join(" "),
				fill: "url(#hatch)",
				stroke: "#7f8c95",
				"stroke-width": 2
			}, g);
			else if (o.kind === "boat") {
				if (o.genericBoat && o.trailer) {
					const t = trailerSize(o);
					const trailer = el("g", { "data-trailer": "true", transform: "rotate(-90)" }, g);
					// Stretch the supporting frame to boat length; keep the tongue beyond the bow.
					for (const part of [
						{ name: "frame", x: -o.h/2, width: o.h, crop: "0 0 494 197" },
						{ name: "tongue", x: o.h/2, width: t.extra, crop: "494 0 115 197" }
					]) {
						const region = el("svg", { "data-trailer-part": part.name, x: part.x,
							y: -t.width/2, width: part.width, height: t.width,
							viewBox: part.crop, preserveAspectRatio: "none", overflow: "hidden" }, trailer);
						el("image", { href: "/_cdn/static/2dccd34c-c6b2-41c9-8918-7678d0b41768-generic-boat-trailer.png",
							x: 0, y: 0, width: 609, height: 197 }, region);
					}
				}
				if (o.image) el("image", {
					href: o.image,
					x: -o.w / 2,
					y: -o.h / 2,
					width: o.w,
					height: o.h,
					preserveAspectRatio: "none"
				}, g);
				else if (o.genericBoat) el("image", {
					href: "/_cdn/static/bb9637d1-9768-4d52-b620-aa5324b4e446-generic-boat-overhead.png",
					x: -o.h / 2,
					y: -o.w / 2,
					width: o.h,
					height: o.w,
					transform: "rotate(-90)",
					preserveAspectRatio: "none"
				}, g);
				else if (premierModel(o.premierModelId)) drawModelImage(g, premierModel(o.premierModelId), o.w, o.h);
				else if (evottiModel(o.evottiModelId)) drawModelImage(g, evottiModel(o.evottiModelId), o.w, o.h, true, o.evottiColorwayId);
				else drawBoat(g, o);
			} else el("rect", {
				x: -o.w / 2,
				y: -o.h / 2,
				width: o.w,
				height: o.h,
				fill: "url(#hatch)",
				stroke: "#7f8c95",
				"stroke-width": 2
			}, g);
			if (ws.length || linkedSelection.has(o.id)) {
				const a = {
					fill: "none",
					stroke: ws.length ? "#df4f31" : "var(--selection-color,#007eae)",
					"stroke-width": ws.length ? 4 : selectedIds.has(o.id) ? 2 : 1.5,
					"stroke-dasharray": !ws.length && !selectedIds.has(o.id) ? "5 4" : "none",
					"vector-effect": "non-scaling-stroke",
					"pointer-events": "none"
				};
				if (o.shape === "circle") el("circle", {
					r: o.w / 2,
					...a
				}, g);
				else if (o.shape === "polygon") el("polygon", {
					points: o.points.map((p) => p.join(",")).join(" "),
					...a
				}, g);
				else if (o.kind === "boat" && (ws.length || o.genericBoat && o.trailer)) for (const points of localFootprints(o)) el("polygon", {
					points: points.map((p) => p.join(",")).join(" "),
					...a
				}, g);
				else el("rect", {
					x: -o.w / 2,
					y: -o.h / 2,
					width: o.w,
					height: o.h,
					...a
				}, g);
			}
			if (o.kind === "dock") {
				const legs = dockLegs(o), unit = view.w / $("canvasWrap").clientWidth, side = unit * 6, hitSide = unit * 16;
				dockCorners(o).forEach(([cx, cy], i) => {
					if (!legs[i] && selected !== o.id) return;
					const leg = el("g", {
						"data-dock-leg": i,
						"data-dock-id": o.id,
						role: "button",
						tabindex: 0,
						"aria-pressed": String(legs[i]),
						"aria-label": `${o.label} corner ${i + 1}: ${legs[i] ? "remove" : "add"} dock leg`,
						class: "dockLeg"
					}, g);
					el("rect", {
						x: cx - hitSide / 2,
						y: cy - hitSide / 2,
						width: hitSide,
						height: hitSide,
						fill: "transparent",
						"pointer-events": "all"
					}, leg);
					el("rect", {
						x: cx - side / 2,
						y: cy - side / 2,
						width: side,
						height: side,
						fill: legs[i] ? "var(--layout-leg-fill,#007eae)" : "var(--layout-handle-bg,#fff)",
						stroke: "var(--layout-leg-fill,#007eae)",
						"stroke-width": .75,
						"vector-effect": "non-scaling-stroke",
						"pointer-events": "none",
						class: "dockLegMarker"
					}, leg);
					el("title", {}, leg).textContent = `Corner ${i + 1}: ${legs[i] ? "Leg present — click to remove" : "No leg — click to add"}`;
				});
			}
			if (selectedIds.size === 1 && selected === o.id && !o.locked) {
				el("line", {
					x1: 0,
					y1: -o.h / 2,
					x2: 0,
					y2: -o.h / 2 - 25,
					stroke: "var(--selection-color,#007eae)",
					"stroke-width": 2,
					"vector-effect": "non-scaling-stroke"
				}, g);
				el("circle", {
					cx: 0,
					cy: -o.h / 2 - 25,
					r: 8,
					fill: "var(--layout-handle-bg,#fff)",
					stroke: "var(--selection-color,#007eae)",
					"stroke-width": 2,
					"data-rotate": o.id
				}, g);
			}
		}
		if (state.labels) for (const o of ordered.filter((o) => o.showLabel !== false)) {
			const g = el("g", {
				"data-id": o.id,
				"data-item-label": o.id,
				class: "itemShape",
				transform: `rotate(${-o.angle})`
			}, itemGroups.get(o.id)), size = labelSize;
			const width = Math.max(50, Math.min(o.label.length, 100) * size * .57 + 18);
			el("rect", {
				x: -width / 2,
				y: -size - 3,
				width,
				height: size + 12,
				rx: 4,
				fill: warnings(o, state).length ? "#bc442a" : "var(--layout-label-bg,#001548)",
				opacity: .94
			}, g);
			text(g, o.label || "Unlabeled", {
				x: 0,
				y: 2,
				"text-anchor": "middle",
				"font-size": size,
				fill: "var(--layout-label-ink,#fff)",
				"font-weight": 600
			});
		}
		if (selectedIds.size > 1) for (const o of ordered.filter((o) => selectedIds.has(o.id))) {
			const b = alignmentBounds(o);
			el("rect", {
				"data-selection": o.id,
				x: b.left - 4,
				y: b.top - 4,
				width: b.right - b.left + 8,
				height: b.bottom - b.top + 8,
				fill: "none",
				stroke: o.id === selected ? "#f57f20" : "var(--selection-color,#007eae)",
				"stroke-width": 2,
				"stroke-dasharray": "6 4",
				"vector-effect": "non-scaling-stroke",
				"pointer-events": "none"
			}, svg);
		}
		if (drawing?.length) {
			el("polyline", {
				points: drawing.map((p) => p.join(",")).join(" "),
				fill: "var(--selection-color,#007eae)",
				"fill-opacity": .2,
				stroke: "var(--selection-color,#007eae)",
				"stroke-width": 2
			}, svg);
			for (const [cx, cy] of drawing) el("circle", {
				cx,
				cy,
				r: 4,
				fill: "var(--selection-color,#007eae)"
			}, svg);
		}
		const materials = dockMaterials(state.items);
		$("dockMaterialsSummary").textContent = `${materials.legs} legs · ${materials.panels} decking panels · ${materials.triangles} triangle pieces${materials.unlisted ? " · " + materials.unlisted + " custom sections: decking not counted" : ""}`;
		syncBranding();
		syncSurroundingsControls();
		syncDisplayControls(display);
		$("dimensions").textContent = `${measure(state.booth.w)} × ${measure(state.booth.h)} booth`;
		$("zoomValue").textContent = `${Math.round((state.booth.w + 160) / view.w * 100)}%`;
		$("showLabels").checked = state.labels;
		$("boothW").value = ft(state.booth.w);
		$("boothH").value = ft(state.booth.h);
		$("undo").disabled = !history.length;
		renderLists();
		syncMovementHover();
		drawDimensionScales(svg, labelSize);
	}
	const floorGroups = /* @__PURE__ */ new Map();
	let floorSelection = null;
	function renderLists() {
		$("warningList").replaceChildren();
		let count = 0;
		for (const [kind, title] of [
			["boat", "Boats"],
			["dock", "Docks"],
			["obstacle", "Obstacles"]
		]) {
			if (!floorGroups.has(kind)) {
				const details = document.createElement("details");
				details.className = "floorGroup";
				details.dataset.itemType = kind;
				const summary = document.createElement("summary"), name = document.createElement("span"), badge = document.createElement("span");
				name.textContent = title;
				badge.className = "count";
				summary.append(name, badge);
				const list = document.createElement("div");
				list.className = "floorGroupItems";
				details.append(summary, list);
				$("itemList").append(details);
				floorGroups.set(kind, {
					details,
					badge,
					list
				});
			}
			const group = floorGroups.get(kind), items = state.items.filter((o) => o.kind === kind);
			group.badge.textContent = items.length;
			group.list.replaceChildren();
			group.details.classList.toggle("hasSelection", items.some((o) => selectedIds.has(o.id)));
			if (selected !== floorSelection && items.some((o) => o.id === selected)) group.details.open = true;
			if (!items.length) {
				const empty = document.createElement("p");
				empty.className = "hint floorGroupEmpty";
				empty.textContent = `No ${title.toLowerCase()} on the floor.`;
				group.list.append(empty);
			}
			for (const o of items) {
				const n = document.createElement("button");
				n.type = "button";
				n.dataset.itemId = o.id;
				n.className = "itemRow" + (selectedIds.has(o.id) ? " selected" : current()?.groupId && o.groupId === current().groupId ? " linkedMember" : "");
				n.setAttribute("aria-pressed", String(selectedIds.has(o.id)));
				const dot = document.createElement("span");
				dot.className = "dot " + {
					boat: "blue",
					dock: "tan",
					obstacle: "gray"
				}[o.kind];
				const label = document.createElement("span");
				label.textContent = o.label || "Unlabeled";
				const small = document.createElement("small");
				small.textContent = (o.locked ? "Locked" : o.kind) + (o.groupId ? " · linked" : "");
				const checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.checked = selectedIds.has(o.id);
				checkbox.setAttribute("aria-label", "Select " + (o.label || "Unlabeled"));
				checkbox.onchange = () => select(o.id, true);
				const row = document.createElement("div");
				row.className = "selectionRow";
				row.append(checkbox, n);
				n.append(dot, label, small);
				n.onclick = (e) => {
					select(o.id, e.shiftKey || e.ctrlKey || e.metaKey || $("multiSelect").checked);
					$("itemList").querySelector(`[data-item-id="${CSS.escape(o.id)}"]`)?.focus({ preventScroll: true });
				};
				group.list.append(row);
			}
		}
		floorSelection = selected;
		for (const o of state.items) {
			const ws = warnings(o, state);
			if (!ws.length) continue;
			count++;
			const n = document.createElement("div");
			n.className = "warning";
			const t = document.createElement("strong");
			t.textContent = o.label || "Unlabeled";
			n.append(t, document.createTextNode(ws.join(" · ")));
			n.onclick = () => select(o.id);
			$("warningList").append(n);
		}
		$("warningCount").textContent = count;
		$("itemCount").textContent = state.items.length;
		if (!count) {
			const p = document.createElement("p");
			p.className = "good";
			p.textContent = "✓ No boundary or obstacle conflicts";
			$("warningList").append(p);
		}
	}
	function syncSelection() {
		const valid = new Set(state.items.map((o) => o.id));
		selectedIds = new Set([...selectedIds].filter((id) => valid.has(id)));
		if (!selected) selectedIds.clear();
		else if (!selectedIds.has(selected)) selectedIds = new Set(valid.has(selected) ? [selected] : []);
		selected = [...selectedIds][0] || null;
	}
	function syncAlignmentControls() {
		const count = selectedIds.size;
		$("alignmentStatus").textContent = count ? count + " selected. Reference: " + (current()?.label || "Unlabeled") + ". Alignments use this first selected item." : "Select two or more items to align.";
		for (const button of document.querySelectorAll("[data-align]")) button.disabled = count < 2;
		$("clearSelection").disabled = !count;
	}
	$("clearSelection").onclick = () => select(null);
	for (const button of document.querySelectorAll("[data-align]")) button.onclick = () => {
		const plan = alignmentPlan(state.items, [...selectedIds], button.dataset.align);
		if (plan.error) return toast(plan.error);
		if (!plan.moves.length) return toast("The selected items are already aligned.");
		checkpoint();
		for (const move of plan.moves) {
			const item = state.items.find((o) => o.id === move.id);
			item.x += move.dx;
			item.y += move.dy;
		}
		save();
		inspector();
		render();
	};
	function select(id, toggle = false) {
		setMovementHover(null);
		if (!id) selectedIds.clear();
		else if (toggle) {
			if (selectedIds.has(id)) selectedIds.delete(id);
			else selectedIds.add(id);
		} else selectedIds = /* @__PURE__ */ new Set([id]);
		selected = [...selectedIds][0] || null;
		const group = floorGroups.get(current()?.kind);
		if (group) group.details.open = true;
		inspector();
		render();
	}
	function inspector() {
		syncSelection();
		const o = selectedIds.size > 1 ? null : current();
		$("itemForm").hidden = !o;
		$("emptyInspector").hidden = !!o || selectedIds.size > 1;
		if (!o) return;
		const layers = layeredItems();
		$("bringFront").disabled = layers.at(-1)?.id === o.id;
		$("sendBack").disabled = layers[0]?.id === o.id;
		for (const [id, v] of Object.entries({
			itemLabel: o.label,
			itemW: o.genericBoat ? o.w : ft(o.w),
			itemH: ft(o.h),
			itemX: ft(o.x),
			itemY: ft(o.y),
			itemAngle: o.angle
		})) $(id).value = v;
		$("trailerControls").hidden = !o.genericBoat;
		$("itemTrailer").checked = !!o.trailer;
		const trailer = trailerSize(o);
		$("trailerSummary").textContent = o.trailer ? `Overall width: ${measure(trailer.width)} (4″ each side). Trailer length: ${measure(trailer.length)}. Extra beyond bow: ${measure(trailer.extra)}. Combined length: ${measure(trailer.total)}. Rear aligned with stern.` : "Trailer frame follows boat length; tongue scales to boat width plus 8″ and stays beyond the bow.";
		$("itemWidthLabel").textContent = o.genericBoat ? "Width · inches" : "Width · ft";
		$("itemW").max = o.genericBoat ? "12000" : "1000";
		$("itemLocked").checked = o.locked;
		$("itemShowLabel").checked = o.showLabel !== false;
		$("itemW").disabled = o.kind === "boat" && !o.genericBoat || o.kind === "dock";
		$("itemH").disabled = o.kind === "dock" || !!o.evottiModelId || !!o.premierModelId;
		$("removeImage").textContent = o.evottiModelId || o.premierModelId ? "Use model image" : o.genericBoat ? "Use generic boat image" : "Use illustration";
		$("boatImageControls").hidden = o.kind !== "boat";
		const colors = evottiColorways(o.evottiModelId);
		$("itemColorwayField").hidden = !colors.length || !!o.image;
		$("itemColorway").replaceChildren();
		for (const color of colors.length ? [{
			id: "original",
			name: "Original manufacturer image"
		}, ...colors] : []) {
			const option = document.createElement("option");
			option.value = color.id;
			option.textContent = color.name;
			$("itemColorway").append(option);
		}
		$("itemColorway").value = o.evottiColorwayId || evottiColorway(o.evottiModelId)?.id || "original";
		for (const id of [
			"itemAngle",
			"rotateLeft",
			"rotateRight",
			"rotate0",
			"rotate90",
			"rotate180",
			"rotate270"
		]) $(id).disabled = o.locked;
		for (const id of ["itemX", "itemY"]) $(id).disabled = movementLocked(state.items, o.id);
		renderMovementControls(o);
	}
	let movementUiKey = "";
	let hoveredMovementItem = null;
	function syncMovementHover() {
		const active = !!current() && !$("itemForm").hidden && !$("inspectorPanel").hidden && $("groupDetails").open;
		const rows = [...$("groupCandidates").querySelectorAll(".groupChoice")];
		const row = active ? rows.find((label) => label.dataset.groupItemId === hoveredMovementItem) : null;
		if (!row) hoveredMovementItem = null;
		for (const label of rows) label.classList.toggle("isHovered", label === row);
		$("movementHoverOutline")?.remove();
		const item = row && state.items.find((o) => o.id === hoveredMovementItem);
		if (!item) return;
		const group = el("g", {
			id: "movementHoverOutline",
			"data-hover-item": item.id,
			transform: `translate(${item.x} ${item.y}) rotate(${item.angle})`,
			"pointer-events": "none",
			fill: "none",
			stroke: "#f57f20",
			"stroke-width": 3,
			"vector-effect": "non-scaling-stroke"
		}, $("canvas"));
		if (item.shape === "circle") el("circle", {
			r: item.w / 2,
			"vector-effect": "non-scaling-stroke"
		}, group);
		else for (const points of localFootprints(item)) el("polygon", {
			points: points.map((p) => p.join(",")).join(" "),
			"vector-effect": "non-scaling-stroke"
		}, group);
	}
	function setMovementHover(id, scroll = false) {
		if (id === hoveredMovementItem) return;
		hoveredMovementItem = id;
		syncMovementHover();
		const row = [...$("groupCandidates").querySelectorAll(".groupChoice")].find((label) => label.dataset.groupItemId === hoveredMovementItem);
		if (scroll && row) {
			const list = $("groupCandidates"), bounds = list.getBoundingClientRect(), rect = row.getBoundingClientRect();
			if (rect.top < bounds.top) list.scrollTop -= bounds.top - rect.top;
			else if (rect.bottom > bounds.bottom) list.scrollTop += rect.bottom - bounds.bottom;
		}
	}
	$("groupDetails").ontoggle = () => {
		if (!$("groupDetails").open) setMovementHover(null);
	};
	function renderMovementControls(o) {
		const members = movementMembers(state.items, o.id), locked = members.filter((m) => m.locked);
		$("movementGroupStatus").textContent = (o.groupId ? members.length + " linked items. " : "This item moves independently. ") + (locked.length ? "Movement locked by " + locked.map((m) => m.label || "Unlabeled").join(", ") + "." : "");
		$("unlinkMovement").hidden = !o.groupId;
		$("ungroupMovement").hidden = !o.groupId;
		const key = JSON.stringify([o.id, state.items.map((m) => [
			m.id,
			m.label,
			m.groupId,
			m.locked
		])]);
		if (key === movementUiKey) return;
		movementUiKey = key;
		$("groupCandidates").replaceChildren();
		for (const candidate of state.items.filter((m) => m.id !== o.id)) {
			const label = document.createElement("label");
			label.className = "groupChoice";
			label.dataset.groupItemId = candidate.id;
			label.onpointerenter = () => setMovementHover(candidate.id);
			label.onpointerleave = () => setMovementHover(null);
			label.onfocusin = () => setMovementHover(candidate.id);
			label.onfocusout = (e) => {
				if (!label.contains(e.relatedTarget)) setMovementHover(null);
			};
			const input = document.createElement("input");
			input.type = "checkbox";
			input.value = candidate.id;
			input.checked = !!o.groupId && candidate.groupId === o.groupId;
			input.disabled = input.checked;
			input.onchange = () => {
				$("linkMovement").disabled = !$("groupCandidates").querySelector("input:checked:not(:disabled)");
			};
			const name = document.createElement("span");
			name.textContent = (candidate.label || "Unlabeled") + (candidate.locked ? " · position locked" : "") + (candidate.groupId ? " · linked" : "");
			label.append(input, name);
			$("groupCandidates").append(label);
		}
		$("linkMovement").disabled = true;
		if (state.items.length < 2) $("groupCandidates").textContent = "Add another item to link movement.";
	}
	function updateMovementGroup(action) {
		const o = current();
		if (!o) return;
		const before = JSON.stringify(state);
		if (!action(o)) return;
		checkpoint(before);
		save();
		inspector();
		render();
	}
	$("linkMovement").onclick = () => updateMovementGroup((o) => linkMovementItems(state.items, [o.id, ...[...$("groupCandidates").querySelectorAll("input:checked")].map((input) => input.value)]));
	$("unlinkMovement").onclick = () => updateMovementGroup((o) => unlinkMovementItem(state.items, o.id));
	$("ungroupMovement").onclick = () => updateMovementGroup((o) => ungroupMovementItems(state.items, o.id));
	function add(o) {
		checkpoint();
		if (state.items.some((item) => item.layerIndex !== void 0)) {
			const order = layeredItems();
			order.forEach((item, i) => item.layerIndex = i);
			o.layerIndex = order.length;
		}
		state.items.push(o);
		selectedIds = /* @__PURE__ */ new Set([o.id]);
		selected = o.id;
		save();
		inspector();
		render();
	}
	function center() {
		return {
			x: state.booth.w / 2,
			y: state.booth.h / 2
		};
	}
	$("addGenericBoat").onclick = () => {
		const w = +$("genericBoatWidth").value, h = +$("genericBoatLength").value;
		if (!Number.isFinite(w) || w < 1 || w > 1200 || !Number.isFinite(h) || h < 1 || h > 100) return toast("Enter width between 1 and 1,200 inches and length between 1 and 100 ft.");
		const { x, y } = center();
		add(item("boat", "Generic boat", x, y, w, h * 12, { genericBoat: true, trailer: $("genericBoatTrailer").checked }));
	};
	$("addBoat").onclick = () => {
		const length = +$("boatLength").value;
		if (!Number.isFinite(length) || length < 1 || length > 100) return toast("Enter a boat length between 1 and 100 ft.");
		const { x, y } = center();
		add(item("boat", $("newLabel").value.trim() || "Boat", x, y, 102, length * 12));
	};
	const premierCatalog = initPremierCatalog((id, width) => {
		const { x, y } = center();
		add(premierBoat(id, width, x, y));
	});
	const catalog = initCatalog((id, colorway) => {
		const { x, y } = center();
		add(modelBoat(id, "", x, y, colorway));
	});
	$("addDock").onclick = () => {
		const { x, y } = center();
		if ($("dockType").value === "triangle") return add(item("dock", "RS4 · Triangle", x, y, 36, 36, {
			shape: "polygon",
			points: [
				[-18, -18],
				[18, -18],
				[-18, 18]
			]
		}));
		const [w, h] = $("dockType").value.split(",").map(Number);
		add(item("dock", "RS4 · " + $("dockType").selectedOptions[0].text.split(" · ")[0], x, y, w, h));
	};
	$("addPole").onclick = () => {
		const { x, y } = center();
		add(item("obstacle", "Facility pole", x, y, 18, 18, { shape: "circle" }));
	};
	$("addObstacle").onclick = () => {
		const { x, y } = center();
		add(item("obstacle", "Facility element", x, y, 36, 48));
	};
	function drawingUI() {
		const active = !!drawing;
		$("finishPolygon").hidden = !active;
		$("cancelPolygon").hidden = !active;
		$("canvasTip").textContent = active ? "Click to place corners · Finish obstacle when done" : "Drag to arrange · drag empty floor to pan · select to edit";
		$("canvas").style.cursor = active ? "crosshair" : "";
		render();
	}
	$("drawPolygon").onclick = () => {
		drawing = [];
		drawingUI();
	};
	$("cancelPolygon").onclick = () => {
		drawing = null;
		drawingUI();
	};
	$("finishPolygon").onclick = () => {
		if (drawing.length < 3) return toast("Place at least three corners.");
		const xs = drawing.map((p) => p[0]), ys = drawing.map((p) => p[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), w = maxX - minX, h = maxY - minY;
		if (w < 1 || h < 1) return toast("Draw an obstacle with width and depth.");
		const x = (minX + maxX) / 2, y = (minY + maxY) / 2, points = drawing.map(([px, py]) => [px - x, py - y]);
		drawing = null;
		add(item("obstacle", "Custom obstacle", x, y, w, h, {
			shape: "polygon",
			points
		}));
		drawingUI();
	};
	$("resize").onclick = () => {
		const w = +$("boothW").value * 12, h = +$("boothH").value * 12;
		if (![w, h].every((n) => Number.isFinite(n) && n >= 12 && n <= 12e3)) return toast("Booth dimensions must be 1–1,000 feet.");
		checkpoint();
		state.booth = {
			w,
			h
		};
		save();
		fit();
	};
	$("itemTrailer").onchange = () => {
		const o = current();
		if (!o?.genericBoat) return;
		checkpoint();
		o.trailer = $("itemTrailer").checked;
		save(); inspector(); render();
	};
	$("itemForm").onsubmit = (e) => {
		e.preventDefault();
		const o = current();
		if (!o) return;
		const w = o.kind === "boat" ? o.genericBoat ? +$("itemW").value : o.premierModelId ? o.w : 102 : o.kind === "dock" ? o.w : +$("itemW").value * 12, h = o.kind === "dock" || o.evottiModelId || o.premierModelId ? o.h : +$("itemH").value * 12, x = movementLocked(state.items, o.id) ? o.x : +$("itemX").value * 12, y = movementLocked(state.items, o.id) ? o.y : +$("itemY").value * 12, angle = o.locked ? o.angle : +$("itemAngle").value;
		if (![
			w,
			h,
			x,
			y,
			angle
		].every(Number.isFinite) || w <= 0 || h <= 0 || w > 12e3 || h > 12e3) return toast("Use positive dimensions up to 1,000 ft and valid coordinates.");
		checkpoint();
		translateGroup(state.items, o.id, x - o.x, y - o.y);
		if (o.shape === "polygon") o.points = o.points.map(([px, py]) => [px * w / o.w, py * h / o.h]);
		Object.assign(o, {
			label: $("itemLabel").value,
			showLabel: $("itemShowLabel").checked,
			w,
			h: o.shape === "circle" ? w : h,
			x,
			y,
			angle: (angle % 360 + 360) % 360,
			locked: $("itemLocked").checked
		});
		save();
		inspector();
		render();
	};
	function setRotation(angle) {
		const o = current();
		if (!o || o.locked) return;
		const next = (angle % 360 + 360) % 360;
		if (o.angle === next) return;
		checkpoint();
		o.angle = next;
		save();
		inspector();
		render();
	}
	function rotate(delta) {
		const o = current();
		if (o) setRotation(o.angle + delta);
	}
	$("rotateLeft").onclick = () => rotate(-15);
	$("rotateRight").onclick = () => rotate(15);
	for (const angle of [
		0,
		90,
		180,
		270
	]) $("rotate" + angle).onclick = () => setRotation(angle);
	$("bringFront").onclick = () => changeLayer(true);
	$("sendBack").onclick = () => changeLayer(false);
	$("duplicate").onclick = () => {
		const o = current();
		if (o) {
			const copy = {
				...structuredClone(o),
				id: crypto.randomUUID(),
				label: o.label + " copy",
				x: o.x + 24,
				y: o.y + 24,
				locked: false
			};
			delete copy.groupId;
			add(copy);
		}
	};
	function remove() {
		if (!current()) return;
		checkpoint();
		state.items = state.items.filter((o) => !selectedIds.has(o.id));
		cleanupMovementGroups(state.items);
		selected = null;
		save();
		inspector();
		render();
	}
	$("delete").onclick = remove;
	$("itemColorway").onchange = (e) => {
		const o = current();
		if (!o) return;
		checkpoint();
		o.evottiColorwayId = e.target.value;
		save();
		render();
	};
	$("boatImage").onchange = async (e) => {
		const o = current(), f = e.target.files[0];
		if (!o || !f) return;
		if (![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(f.type) || f.size > 2097152) return toast("Choose a PNG, JPG, or WebP image under 2 MB.");
		const reader = new FileReader();
		reader.onload = () => {
			checkpoint();
			o.image = reader.result;
			save();
			inspector();
			render();
		};
		reader.readAsDataURL(f);
		e.target.value = "";
	};
	$("removeImage").onclick = () => {
		const o = current();
		if (o) {
			checkpoint();
			delete o.image;
			save();
			inspector();
			render();
		}
	};
	$("itemShowLabel").onchange = (e) => {
		const o = current();
		if (!o) return;
		checkpoint();
		o.showLabel = e.target.checked;
		save();
		render();
	};
	$("showLabels").onchange = (e) => {
		checkpoint();
		state.labels = e.target.checked;
		save();
		render();
	};
	$("fit").onclick = fit;
	$("zoomIn").onclick = () => zoom(.8);
	$("zoomOut").onclick = () => zoom(1.25);
	$("undo").onclick = () => {
		if (!history.length) return;
		const previousSurroundings = JSON.stringify(state.surroundings);
		state = JSON.parse(history.pop());
		if (!current()) selected = null;
		save();
		inspector();
		if (JSON.stringify(state.surroundings) !== previousSurroundings) fit();
		else render();
	};
	$("resetLayout").onclick = () => {
		if (!window.confirm("Reset this layout and delete everything? All boats, docks, obstacles, venue details, and layout settings will be cleared.")) return;
		checkpoint();
		state = {
			version: 1,
			booth: {
				w: 720,
				h: 480
			},
			labels: true,
			items: []
		};
		selected = null;
		drawing = null;
		drag = null;
		save();
		inspector();
		drawingUI();
		fit();
		toast("Layout reset. Use Undo to restore the previous layout.");
	};
	$("export").onclick = () => {
		const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })), a = document.createElement("a");
		a.href = url;
		a.download = "lvm-show-layout.json";
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	};
	$("import").onclick = () => $("importFile").click();
	$("importFile").onchange = async (e) => {
		try {
			const f = e.target.files[0];
			if (!f) return;
			if (f.size > 10485760) throw Error("Layout file exceeds 10 MB.");
			const next = JSON.parse(await f.text());
			if (!validState(next)) throw Error("This file is not a supported LVM layout.");
			checkpoint();
			state = rescaleCatalogBoats(next);
			selected = null;
			save();
			inspector();
			fit();
		} catch (err) {
			toast(err.message);
		}
		e.target.value = "";
	};
	function toggleDockLeg(id, index) {
		const dock = state.items.find((o) => o.id === id && o.kind === "dock");
		if (!dock || !Number.isInteger(index) || index < 0 || index >= dockCorners(dock).length) return;
		checkpoint();
		const legs = dockLegs(dock);
		legs[index] = !legs[index];
		dock.dockLegs = legs;
		selected = id;
		save();
		inspector();
		render();
	}
	$("canvas").addEventListener("keydown", (e) => {
		const corner = e.target.closest("[data-dock-leg]");
		if (!corner || !["Enter", " "].includes(e.key)) return;
		e.preventDefault();
		e.stopPropagation();
		const { dockId, dockLeg } = corner.dataset;
		toggleDockLeg(dockId, +dockLeg);
		$("canvas").querySelector(`[data-dock-id="${CSS.escape(dockId)}"][data-dock-leg="${dockLeg}"]`)?.focus();
	});
	$("canvas").onpointerdown = (e) => {
		if (e.button !== 0) return;
		const corner = e.target.closest("[data-dock-leg]");
		if (corner) {
			e.preventDefault();
			toggleDockLeg(corner.dataset.dockId, +corner.dataset.dockLeg);
			return;
		}
		setMovementHover(null);
		const p = point(e);
		if (drawing) {
			drawing.push([p.x, p.y]);
			render();
			return;
		}
		const rotateId = e.target.closest("[data-rotate]")?.dataset.rotate, id = rotateId || e.target.closest("[data-id]")?.dataset.id;
		if (id) {
			if (!rotateId && (e.shiftKey || e.ctrlKey || e.metaKey || $("multiSelect").checked)) {
				select(id, true);
				return;
			}
			if (!selectedIds.has(id)) select(id);
			const o = state.items.find((o) => o.id === id);
			if (o.locked) return;
			if (!rotateId && [...selectedIds].some((id) => movementLocked(state.items, id))) {
				toast("Unlock linked items before moving this group.");
				return;
			}
			checkpoint();
			drag = {
				members: [...new Set([...selectedIds].flatMap((id) => movementMembers(state.items, id).map((o) => o.id)))],
				id,
				start: p,
				x: o.x,
				y: o.y,
				angle: o.angle,
				rotation: !!rotateId,
				origin: Math.atan2(p.y - o.y, p.x - o.x)
			};
		} else {
			select(null);
			drag = {
				pan: true,
				clientX: e.clientX,
				clientY: e.clientY,
				view: { ...view }
			};
		}
		$("canvas").setPointerCapture(e.pointerId);
	};
	$("canvas").onpointerleave = () => setMovementHover(null);
	$("canvas").onpointermove = (e) => {
		if (!drag) {
			if (e.pointerType !== "touch") setMovementHover(e.target.closest("[data-id]")?.dataset.id || null, true);
			return;
		}
		if (drag.pan) {
			const rect = $("canvas").getBoundingClientRect(), scale = Math.max(view.w / rect.width, view.h / rect.height);
			view.x = drag.view.x - (e.clientX - drag.clientX) * scale;
			view.y = drag.view.y - (e.clientY - drag.clientY) * scale;
			render();
			return;
		}
		const o = state.items.find((o) => o.id === drag.id), p = point(e);
		if (drag.rotation) o.angle = ((drag.angle + (Math.atan2(p.y - o.y, p.x - o.x) - drag.origin) * 180 / Math.PI) % 360 + 360) % 360;
		else {
			const dx = drag.x + p.x - drag.start.x - o.x, dy = drag.y + p.y - drag.start.y - o.y;
			for (const member of state.items.filter((item) => drag.members.includes(item.id))) {
				member.x += dx;
				member.y += dy;
			}
		}
		render();
		inspector();
	};
	function endDrag() {
		if (drag && !drag.pan) save();
		drag = null;
	}
	$("canvas").onpointerup = endDrag;
	$("canvas").onpointercancel = endDrag;
	$("canvas").onwheel = (e) => {
		e.preventDefault();
		zoom(e.deltaY > 0 ? 1.08 : .925);
	};
	document.addEventListener("keydown", (e) => {
		if (catalog.isOpen() || premierCatalog.isOpen() || [
			"INPUT",
			"SELECT",
			"TEXTAREA"
		].includes(e.target.tagName)) return;
		if (e.key === "Escape") {
			drawing = null;
			drawingUI();
			select(null);
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "z") {
			e.preventDefault();
			$("undo").click();
		}
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			remove();
		}
		const d = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1]
		}[e.key], o = current();
		if (d && o) {
			e.preventDefault();
			if ([...selectedIds].some((id) => movementLocked(state.items, id))) {
				toast("Unlock selected items and their linked groups before moving.");
				return;
			}
			checkpoint();
			const step = e.shiftKey ? 12 : 1, ids = new Set([...selectedIds].flatMap((id) => movementMembers(state.items, id).map((o) => o.id)));
			for (const member of state.items.filter((item) => ids.has(item.id))) {
				member.x += d[0] * step;
				member.y += d[1] * step;
			}
			save();
			inspector();
			render();
		}
	});
	function drawGuides(svg, defs, display) {
		const o = current();
		if (!display.guides || !o) return;
		let xs, ys;
		if (o.shape === "circle") {
			xs = [
				o.x - o.w / 2,
				o.x,
				o.x + o.w / 2
			];
			ys = [
				o.y - o.w / 2,
				o.y,
				o.y + o.w / 2
			];
		} else {
			const points = footprints(o).flat();
			xs = [
				Math.min(...points.map((p) => p.x)),
				o.x,
				Math.max(...points.map((p) => p.x))
			];
			ys = [
				Math.min(...points.map((p) => p.y)),
				o.y,
				Math.max(...points.map((p) => p.y))
			];
		}
		const clip = el("clipPath", { id: "boothGuideClip" }, defs);
		el("rect", {
			width: state.booth.w,
			height: state.booth.h
		}, clip);
		const g = el("g", {
			"data-guides": "true",
			"clip-path": "url(#boothGuideClip)",
			"pointer-events": "none",
			stroke: "var(--guide-color,#087fad)",
			"stroke-width": 1,
			"stroke-dasharray": "6 5",
			opacity: .7
		}, svg);
		for (const x of xs) el("line", {
			x1: x,
			y1: 0,
			x2: x,
			y2: state.booth.h,
			"vector-effect": "non-scaling-stroke"
		}, g);
		for (const y of ys) el("line", {
			x1: 0,
			y1: y,
			x2: state.booth.w,
			y2: y,
			"vector-effect": "non-scaling-stroke"
		}, g);
	}
	function syncDisplayControls(display) {
		$("showGrid").checked = display.showGrid;
		$("showGuides").checked = display.guides;
		$("gridSpacing").value = display.spacingIn;
		$("gridStyle").value = display.style;
		$("gridColor").value = display.color;
		$("gridContrast").value = Math.round(display.opacity * 100);
		$("gridContrastValue").textContent = Math.round(display.opacity * 100) + "%";
		$("gridInfo").textContent = display.showGrid ? (display.style === "dots" ? "Dot spacing = " : "1 square = ") + display.spacingIn / 12 + " ft · Dimensions in feet / inches" : "Grid hidden · Dimensions in feet / inches";
		for (const id of [
			"gridSpacing",
			"gridStyle",
			"gridColor",
			"gridContrast"
		]) $(id).disabled = !display.showGrid;
	}
	function updateDisplay(patch) {
		checkpoint();
		state.display = displaySettings({
			...displaySettings(state.display),
			...patch
		});
		save();
		render();
	}
	$("showGrid").onchange = (e) => updateDisplay({ showGrid: e.target.checked });
	$("showGuides").onchange = (e) => {
		updateDisplay({ guides: e.target.checked });
		if (e.target.checked && !current()) toast("Select an item to see guides through its center and outer edges.");
	};
	$("gridSpacing").onchange = (e) => updateDisplay({ spacingIn: Number(e.target.value) });
	$("gridStyle").onchange = (e) => updateDisplay({ style: e.target.value });
	$("gridColor").onchange = (e) => updateDisplay({ color: e.target.value });
	$("gridContrast").onchange = (e) => updateDisplay({ opacity: Number(e.target.value) / 100 });
	$("resetGrid").onclick = () => updateDisplay({
		...displaySettings(),
		guides: displaySettings(state.display).guides
	});
	function drawDimensionScales(svg, labelSize) {
		const overlay = el("g", {
			"data-dimension-scales": "true",
			"pointer-events": "none"
		}, svg);
		const attrs = {
			"font-size": labelSize,
			fill: "#314b63",
			stroke: "#fff",
			"stroke-width": 3,
			"stroke-linejoin": "round",
			"paint-order": "stroke fill",
			"vector-effect": "non-scaling-stroke"
		};
		for (let x = 0; x <= state.booth.w; x += 120) text(overlay, `${x / 12}′`, {
			...attrs,
			x,
			y: -13,
			"text-anchor": "middle"
		});
		for (let y = 0; y <= state.booth.h; y += 120) text(overlay, `${y / 12}′`, {
			...attrs,
			x: -15,
			y: y + 4,
			"text-anchor": "end"
		});
	}
	function drawSurroundings(svg) {
		for (const area of surroundingAreas(state)) {
			const g = el("g", {
				"data-surrounding-edge": area.edge,
				"pointer-events": "none"
			}, svg);
			el("title", {}, g).textContent = area.edge + " edge: " + area.label;
			el("rect", {
				x: area.x,
				y: area.y,
				width: area.w,
				height: area.h,
				rx: 3,
				fill: "#eef3f7",
				stroke: "#71879b",
				"stroke-width": 1.25,
				"stroke-dasharray": "7 4",
				"vector-effect": "non-scaling-stroke"
			}, g);
			const cx = area.x + area.w / 2, cy = area.y + area.h / 2, { lines, size, maxWidth, rotation } = surroundingLabel(area);
			const label = el("g", { transform: "translate(" + cx + " " + cy + ") rotate(" + rotation + ")" }, g);
			lines.forEach((line, index) => {
				const attrs = {
					x: 0,
					y: (index - (lines.length - 1) / 2) * size * 1.3,
					"text-anchor": "middle",
					"dominant-baseline": "central",
					"font-size": size,
					"font-weight": 600,
					fill: "#314b63"
				};
				if (line.length * size * .65 > maxWidth) {
					attrs.textLength = maxWidth;
					attrs.lengthAdjust = "spacingAndGlyphs";
				}
				text(label, line, attrs);
			});
		}
	}
	function syncSurroundingsControls() {
		const settings = surroundingSettings(state.surroundings);
		for (const edge of SURROUNDING_EDGES) {
			if (document.activeElement !== $("surrounding-" + edge)) $("surrounding-" + edge).value = settings[edge].label;
			if (document.activeElement !== $("surrounding-depth-" + edge)) $("surrounding-depth-" + edge).value = ft(settings[edge].depth);
			if (document.activeElement !== $("surrounding-rotation-" + edge)) $("surrounding-rotation-" + edge).value = settings[edge].rotation;
		}
		$("clearSurroundings").disabled = !surroundingAreas(state).length;
	}
	function updateSurrounding(edge, patch) {
		const next = surroundingSettings(state.surroundings);
		Object.assign(next[edge], patch);
		if (JSON.stringify(next) === JSON.stringify(surroundingSettings(state.surroundings))) return;
		checkpoint();
		state.surroundings = next;
		save();
		fit();
	}
	for (const edge of SURROUNDING_EDGES) {
		$("surrounding-" + edge).onchange = (e) => updateSurrounding(edge, { label: e.target.value.trim() });
		$("surrounding-depth-" + edge).onchange = (e) => {
			const depth = Number(e.target.value) * 12;
			if (!Number.isFinite(depth) || depth < 12 || depth > 1200) {
				e.target.value = ft(surroundingSettings(state.surroundings)[edge].depth);
				return toast("Surrounding area depth must be 1–100 feet.");
			}
			updateSurrounding(edge, { depth });
		};
		$("surrounding-rotation-" + edge).onchange = (e) => {
			const rotation = Number(e.target.value);
			if (e.target.value.trim() === "" || !Number.isFinite(rotation) || rotation < 0 || rotation > 360) {
				e.target.value = surroundingSettings(state.surroundings)[edge].rotation;
				return toast("Label rotation must be 0–360 degrees.");
			}
			e.target.value = rotation % 360;
			updateSurrounding(edge, { rotation: rotation % 360 });
		};
	}
	$("clearSurroundings").onclick = () => {
		if (!surroundingAreas(state).length) return;
		checkpoint();
		delete state.surroundings;
		save();
		fit();
	};
	function syncBranding() {
		const venue = venueSettings(state.venue);
		$("layoutTitle").textContent = venue.name || "Boat show layout";
		if (document.activeElement !== $("venueName")) $("venueName").value = venue.name;
		$("venueLogoPreview").hidden = !venue.logo;
		$("venueLogoPlaceholder").hidden = !!venue.logo;
		$("removeVenueLogo").hidden = !venue.logo;
		if (venue.logo) {
			if ($("venueLogoPreview").getAttribute("src") !== venue.logo) $("venueLogoPreview").src = venue.logo;
		} else $("venueLogoPreview").removeAttribute("src");
		$("venueLogoPreview").alt = venue.name ? venue.name + " logo" : "Venue logo";
		$("venueFileName").textContent = venue.logoFileName || "Drop a logo here";
	}
	function updateVenue(patch) {
		checkpoint();
		state.venue = {
			...venueSettings(state.venue),
			...patch
		};
		save();
		render();
	}
	$("venueName").onchange = (e) => updateVenue({ name: e.target.value.trim() });
	let venueUploadPending = false;
	async function uploadVenueLogo(file) {
		if (!file || venueUploadPending) return;
		venueUploadPending = true;
		try {
			updateVenue(await prepareVenueLogo(file));
		} catch (error) {
			toast(error.message);
		} finally {
			venueUploadPending = false;
			$("venueLogoFile").value = "";
		}
	}
	$("uploadVenueLogo").onclick = () => $("venueLogoFile").click();
	$("venueLogoHolder").onclick = () => $("venueLogoFile").click();
	$("venueLogoFile").onchange = (e) => uploadVenueLogo(e.target.files[0]);
	$("removeVenueLogo").onclick = () => updateVenue({
		logo: "",
		logoFileName: ""
	});
	$("venueLogoDrop").ondragover = (e) => {
		e.preventDefault();
		$("venueLogoDrop").classList.add("dragging");
	};
	$("venueLogoDrop").ondragleave = () => $("venueLogoDrop").classList.remove("dragging");
	$("venueLogoDrop").ondrop = (e) => {
		e.preventDefault();
		$("venueLogoDrop").classList.remove("dragging");
		uploadVenueLogo(e.dataTransfer.files[0]);
	};
	const THEME_KEY = "lvm-show-theme-v1";
	let theme = "marina";
	try {
		theme = normalizeTheme(localStorage.getItem(THEME_KEY));
	} catch {}
	document.body.dataset.theme = theme;
	$("themeChoice").value = theme;
	$("themeChoice").onchange = (e) => {
		const choice = normalizeTheme(e.target.value);
		document.body.dataset.theme = choice;
		try {
			localStorage.setItem(THEME_KEY, choice);
		} catch {
			toast("Theme changed, but the browser could not save this preference.");
		}
	};
	const PANEL_KEY = "lvm-show-panels-v1";
	const mobilePanels = window.matchMedia("(max-width:800px)");
	const panels = {
		desktop: {
			library: false,
			inspector: false
		},
		mobile: {
			library: true,
			inspector: true
		}
	};
	try {
		const saved = JSON.parse(localStorage.getItem(PANEL_KEY));
		for (const mode of ["desktop", "mobile"]) for (const panel of ["library", "inspector"]) if (typeof saved?.[mode]?.[panel] === "boolean") panels[mode][panel] = saved[mode][panel];
	} catch {}
	function applySidebars() {
		const workspace = $("layoutWorkspace"), mode = mobilePanels.matches ? "mobile" : "desktop";
		if (mode === "mobile" && !panels.mobile.library && !panels.mobile.inspector) panels.mobile.inspector = true;
		for (const panel of ["library", "inspector"]) {
			const collapsed = panels[mode][panel], title = panel === "library" ? "Library" : "Inspector";
			const button = $(panel === "library" ? "toggleLibrary" : "toggleInspector");
			workspace.classList.toggle(panel + "-collapsed", collapsed);
			$(panel + "Panel").hidden = collapsed;
			button.setAttribute("aria-expanded", String(!collapsed));
			button.setAttribute("aria-label", (collapsed ? "Open " : "Collapse ") + panel);
			button.title = (collapsed ? "Open " : "Collapse ") + title;
			button.querySelector(".tabArrow").textContent = panel === "library" ? collapsed ? "›" : "‹" : collapsed ? "‹" : "›";
		}
		if ($("inspectorPanel").hidden) setMovementHover(null);
		workspace.style.setProperty("--actual-header-height", document.querySelector("header").getBoundingClientRect().height + "px");
	}
	function toggleSidebar(panel) {
		const mode = mobilePanels.matches ? "mobile" : "desktop";
		panels[mode][panel] = !panels[mode][panel];
		if (mode === "mobile" && !panels[mode][panel]) panels.mobile[panel === "library" ? "inspector" : "library"] = true;
		applySidebars();
		try {
			localStorage.setItem(PANEL_KEY, JSON.stringify(panels));
		} catch {}
		if (typeof ResizeObserver === "undefined") requestAnimationFrame(fit);
	}
	$("toggleLibrary").onclick = () => toggleSidebar("library");
	$("toggleInspector").onclick = () => toggleSidebar("inspector");
	mobilePanels.addEventListener("change", applySidebars);
	applySidebars();
	if (typeof ResizeObserver !== "undefined") {
		let lastWidth = 0, lastHeight = 0;
		new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width > 0 && height > 0 && (width !== lastWidth || height !== lastHeight)) {
				lastWidth = width;
				lastHeight = height;
				fit();
			}
		}).observe($("canvasWrap"));
		new ResizeObserver(() => {
			$("layoutWorkspace").style.setProperty("--actual-header-height", document.querySelector("header").getBoundingClientRect().height + "px");
		}).observe(document.querySelector("header"));
	}
	window.addEventListener("resize", () => render());
	inspector();
	fit();
	initPrintLayout(() => {
		const previous = {
			selected,
			selectedIds: new Set(selectedIds),
			labels: state.labels,
			view,
			floorSelection,
			floorOpen: [...floorGroups].map(([kind, group]) => [kind, group.details.open])
		};
		try {
			selected = null;
			state.labels = true;
			view = printBounds(state);
			render();
			const bounds = $("canvas").getBBox(), pad = Math.max(2, Math.max(bounds.width, bounds.height) * .005);
			const svg = $("canvas").cloneNode(true);
			svg.setAttribute("viewBox", `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`);
			svg.querySelector("#movementHoverOutline")?.remove();
			return {
				state: structuredClone(state),
				svg
			};
		} finally {
			selectedIds = previous.selectedIds;
			selected = previous.selected;
			state.labels = previous.labels;
			view = previous.view;
			render();
			floorSelection = previous.floorSelection;
			for (const [kind, open] of previous.floorOpen) floorGroups.get(kind).details.open = open;
		}
	});

return {getState:()=>structuredClone(state),getRecovery:()=>previousDraft?structuredClone(previousDraft):null,loadState:next=>{const copy=structuredClone(next);if(!validState(copy))throw Error('Unsupported layout.');checkpoint();state=rescaleCatalogBoats(copy);selected=null;selectedIds=new Set();drawing=null;drag=null;save();inspector();drawingUI();fit();}};
})();
}
