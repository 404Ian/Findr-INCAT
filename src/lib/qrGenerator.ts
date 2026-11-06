// Zero-dependency ISO/IEC 18004 QR Code Matrix, SVG & PNG Data URL Generator

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x;
        GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
        GF_EXP[i] = GF_EXP[i - 255];
    }
})();

function gfMul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
        const next = new Uint8Array(poly.length + 1);
        const factor = GF_EXP[i];
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], factor);
        }
        poly = next;
    }
    return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
    const gen = rsGeneratorPoly(ecLen);
    const rem = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ rem[0];
        rem.copyWithin(0, 1);
        rem[ecLen - 1] = 0;
        if (factor !== 0) {
            for (let j = 0; j < ecLen; j++) {
                rem[j] ^= gfMul(gen[j + 1], factor);
            }
        }
    }
    return rem;
}

interface VersionSpec {
    version: number;
    size: number;
    dataCodewords: number;
    ecCodewordsPerBlock: number;
    numBlocks: number;
    alignmentCenters: number[];
}

// QR Versions 1-6 (EC Level L) — supports URLs up to 134 bytes
const VERSION_SPECS: readonly VersionSpec[] = [
    {
        version: 1,
        size: 21,
        dataCodewords: 19,
        ecCodewordsPerBlock: 7,
        numBlocks: 1,
        alignmentCenters: [],
    },
    {
        version: 2,
        size: 25,
        dataCodewords: 34,
        ecCodewordsPerBlock: 10,
        numBlocks: 1,
        alignmentCenters: [6, 18],
    },
    {
        version: 3,
        size: 29,
        dataCodewords: 55,
        ecCodewordsPerBlock: 15,
        numBlocks: 1,
        alignmentCenters: [6, 22],
    },
    {
        version: 4,
        size: 33,
        dataCodewords: 80,
        ecCodewordsPerBlock: 20,
        numBlocks: 1,
        alignmentCenters: [6, 26],
    },
    {
        version: 5,
        size: 37,
        dataCodewords: 108,
        ecCodewordsPerBlock: 26,
        numBlocks: 1,
        alignmentCenters: [6, 30],
    },
    {
        version: 6,
        size: 41,
        dataCodewords: 136,
        ecCodewordsPerBlock: 18,
        numBlocks: 2,
        alignmentCenters: [6, 34],
    },
];

function selectVersion(byteLength: number): VersionSpec {
    for (const spec of VERSION_SPECS) {
        if (byteLength + 2 <= spec.dataCodewords) {
            return spec;
        }
    }
    return VERSION_SPECS[VERSION_SPECS.length - 1];
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
    const bits: number[] = [];
    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) {
            bits.push((val >>> i) & 1);
        }
    };

    // Byte mode indicator (0100) + 8-bit length
    pushBits(0b0100, 4);
    pushBits(bytes.length, 8);
    for (let i = 0; i < bytes.length; i++) {
        pushBits(bytes[i], 8);
    }

    const maxBits = spec.dataCodewords * 8;
    const terminator = Math.min(4, maxBits - bits.length);
    pushBits(0, terminator);
    while (bits.length % 8 !== 0) bits.push(0);

    const data = new Uint8Array(spec.dataCodewords);
    for (let i = 0; i < bits.length / 8; i++) {
        let b = 0;
        for (let j = 0; j < 8; j++) {
            b = (b << 1) | bits[i * 8 + j];
        }
        data[i] = b;
    }

    const pads = [0xec, 0x11];
    for (let i = bits.length / 8, p = 0; i < spec.dataCodewords; i++, p ^= 1) {
        data[i] = pads[p];
    }

    if (spec.numBlocks === 1) {
        const ec = rsEncode(data, spec.ecCodewordsPerBlock);
        const out = new Uint8Array(data.length + ec.length);
        out.set(data, 0);
        out.set(ec, data.length);
        return out;
    }

    // Interleave blocks (Version 6 has 2 blocks of 68 data + 18 EC)
    const blockLen = spec.dataCodewords / spec.numBlocks;
    const dataBlocks: Uint8Array[] = [];
    const ecBlocks: Uint8Array[] = [];
    for (let b = 0; b < spec.numBlocks; b++) {
        const slice = data.slice(b * blockLen, (b + 1) * blockLen);
        dataBlocks.push(slice);
        ecBlocks.push(rsEncode(slice, spec.ecCodewordsPerBlock));
    }

    const out: number[] = [];
    for (let i = 0; i < blockLen; i++) {
        for (let b = 0; b < spec.numBlocks; b++) out.push(dataBlocks[b][i]);
    }
    for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
        for (let b = 0; b < spec.numBlocks; b++) out.push(ecBlocks[b][i]);
    }
    return new Uint8Array(out);
}

export function createQrMatrix(text: string): boolean[][] {
    const bytes = new TextEncoder().encode(text);
    const spec = selectVersion(bytes.length);
    const size = spec.size;

    const modules: boolean[][] = Array.from({ length: size }, () =>
        Array<boolean>(size).fill(false),
    );
    const isFunction: boolean[][] = Array.from({ length: size }, () =>
        Array<boolean>(size).fill(false),
    );

    const setFunctionModule = (r: number, c: number, dark: boolean) => {
        if (r < 0 || r >= size || c < 0 || c >= size) return;
        modules[r][c] = dark;
        isFunction[r][c] = true;
    };

    // Finder patterns + separators
    const drawFinder = (topR: number, leftC: number) => {
        for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
                const r = topR + dr;
                const c = leftC + dc;
                const inOuter =
                    dr >= 0 &&
                    dr <= 6 &&
                    dc >= 0 &&
                    dc <= 6 &&
                    (dr === 0 || dr === 6 || dc === 0 || dc === 6);
                const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                setFunctionModule(r, c, inOuter || inInner);
            }
        }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
        setFunctionModule(6, i, i % 2 === 0);
        setFunctionModule(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const centers = spec.alignmentCenters;
    for (const r of centers) {
        for (const c of centers) {
            if (
                (r === 6 && c === 6) ||
                (r === 6 && c === size - 7) ||
                (r === size - 7 && c === 6)
            ) {
                continue;
            }
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
                    setFunctionModule(r + dr, c + dc, dark);
                }
            }
        }
    }

    // Dark module & reserve format info slots
    setFunctionModule(size - 8, 8, true);
    for (let i = 0; i <= 8; i++) {
        if (!isFunction[8][i]) setFunctionModule(8, i, false);
        if (!isFunction[i][8]) setFunctionModule(i, 8, false);
    }
    for (let i = 0; i < 8; i++) {
        setFunctionModule(8, size - 1 - i, false);
        setFunctionModule(size - 1 - i, 8, false);
    }

    // Place data bits in upward/downward 2-column zig-zag
    const codewords = buildCodewords(bytes, spec);
    let bitIdx = 0;
    const totalBits = codewords.length * 8;

    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
            for (let j = 0; j < 2; j++) {
                const c = right - j;
                const upward = ((right + 1) & 2) === 0;
                const r = upward ? size - 1 - vert : vert;
                if (!isFunction[r][c]) {
                    let dark = false;
                    if (bitIdx < totalBits) {
                        dark =
                            ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) &
                                1) !==
                            0;
                        bitIdx++;
                    }
                    // Mask pattern 0: (r + c) % 2 === 0
                    if ((r + c) % 2 === 0) dark = !dark;
                    modules[r][c] = dark;
                }
            }
        }
    }

    // Format information for EC Level L (01) + Mask 0 (000) => 0x77c4
    const formatBits = 0x77c4;
    const getFormatBit = (i: number) => ((formatBits >>> i) & 1) !== 0;

    for (let i = 0; i <= 5; i++) setFunctionModule(8, i, getFormatBit(i));
    setFunctionModule(8, 7, getFormatBit(6));
    setFunctionModule(8, 8, getFormatBit(7));
    setFunctionModule(7, 8, getFormatBit(8));
    for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, getFormatBit(i));

    for (let i = 0; i < 8; i++)
        setFunctionModule(8, size - 1 - i, getFormatBit(i));
    for (let i = 8; i < 15; i++)
        setFunctionModule(size - 15 + i, 8, getFormatBit(i));

    return modules;
}

export function renderQrToSvgString(
    text: string,
    options?: { dark?: string; light?: string; margin?: number },
): string {
    const dark = options?.dark ?? "#052e16";
    const light = options?.light ?? "#ffffff";
    const margin = options?.margin ?? 2;
    const matrix = createQrMatrix(text);
    const size = matrix.length;
    const viewSize = size + margin * 2;

    let path = "";
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c]) {
                path += `M${c + margin},${r + margin}h1v1h-1z`;
            }
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}

export async function renderQrToDataUrl(
    text: string,
    options?: {
        width?: number;
        dark?: string;
        light?: string;
        margin?: number;
    },
): Promise<string> {
    const width = options?.width ?? 360;
    const dark = options?.dark ?? "#052e16";
    const light = options?.light ?? "#ffffff";
    const margin = options?.margin ?? 2;
    const matrix = createQrMatrix(text);
    const size = matrix.length;
    const totalModules = size + margin * 2;

    if (typeof document === "undefined") {
        const svg = renderQrToSvgString(text, { dark, light, margin });
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        const svg = renderQrToSvgString(text, { dark, light, margin });
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, width);

    const scale = width / totalModules;
    ctx.fillStyle = dark;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c]) {
                const x = Math.floor((c + margin) * scale);
                const y = Math.floor((r + margin) * scale);
                const w = Math.ceil((c + margin + 1) * scale) - x;
                const h = Math.ceil((r + margin + 1) * scale) - y;
                ctx.fillRect(x, y, w, h);
            }
        }
    }

    return canvas.toDataURL("image/png");
}
