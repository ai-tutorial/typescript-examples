import { parse } from "node-html-parser";

export interface Chunk {
    content: string;
    metadata: {
        section_path: string;
        element_type: string;
    };
}

export function fixedSizeChunking(
    text: string,
    chunkSize = 500,  // Characters
    overlap = 50
): string[] {
    /**
     * Simple fixed-size chunking with overlap.
     * Overlap preserves context at boundaries.
     */
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        const chunk = text.slice(start, end);
        chunks.push(chunk);
        start += chunkSize - overlap;  // Step back for overlap
    }

    return chunks;
}

export function semanticChunking(
    text: string,
    chunkSize = 1000,  // Target size in characters
    chunkOverlap = 200
): string[] {
    /**
     * Split at semantic boundaries (newlines, periods).
     * Respects document structure better than fixed-size.
     */
    const separators = [
        "\n\n",  // Paragraph breaks (preferred)
        "\n",    // Line breaks
        ". ",    // Sentences
        " ",     // Words
        ""       // Characters (fallback)
    ];

    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
        let bestSplit = currentPos + chunkSize;

        // Try to find best split point using separators
        for (const sep of separators) {
            const searchPos = text.lastIndexOf(sep, currentPos + chunkSize);
            if (searchPos > currentPos) {
                bestSplit = sep === "" ? currentPos + chunkSize : searchPos + sep.length;
                break;
            }
        }

        const chunk = text.slice(currentPos, bestSplit);
        if (chunk) {
            chunks.push(chunk);
        }

        // Move forward with overlap
        currentPos = bestSplit - chunkOverlap;
        if (currentPos < 0) currentPos = 0;
    }

    return chunks;
}

export function structureAwareChunking(
    html: string,
    _maxChunkSize = 800
): Chunk[] {
    /**
     * Chunk based on HTML structure (headers, sections).
     * Maintains hierarchical context for each chunk.
     */
    const root = parse(html);
    const chunks: Chunk[] = [];

    // Track current section context
    let currentContext: string[] = [];

    const elements = root.querySelectorAll("h1, h2, h3, p, li");

    for (const element of elements) {
        const tagName = element.tagName.toLowerCase();

        // Update context when hitting headers
        if (["h1", "h2", "h3"].includes(tagName)) {
            const level = parseInt(tagName[1]);  // h1=1, h2=2, h3=3
            currentContext = currentContext.slice(0, level - 1);  // Trim deeper levels
            currentContext.push(element.textContent);
        }

        // For content elements, create chunk with context
        else if (["p", "li"].includes(tagName)) {
            const content = element.textContent;

            // Build chunk with hierarchical context
            const chunkText = currentContext.join(" > ") + "\n\n" + content;

            chunks.push({
                content: chunkText,
                metadata: {
                    section_path: currentContext.join(" > "),
                    element_type: tagName
                }
            });
        }
    }

    return chunks;
}
