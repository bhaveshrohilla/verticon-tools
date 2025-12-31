document.addEventListener('DOMContentLoaded', () => {
    const PAGE_SIZES = { 'A4': [595.28, 841.89], 'Letter': [612, 792], 'Legal': [612, 1008] };
    const filesArray = [];
    
    // UI Elements
    const dropZone = document.getElementById('drop-zone'), fileInput = document.getElementById('file-input');
    const imageListEl = document.getElementById('image-list'), statusMsg = document.getElementById('status-msg');
    const convertBtn = document.getElementById('convert-btn'), reprocessBtn = document.getElementById('reprocess-btn');
    const downloadLink = document.getElementById('download-link'), convertNewBtn = document.getElementById('convert-new-btn'), clearBtn = document.getElementById('clear-btn');
    const pageSizeSelect = document.getElementById('page-size'), pageLayoutSelect = document.getElementById('page-layout'), pageOrientationSelect = document.getElementById('page-orientation');

    // Init visibility
    const updateLayoutVisibility = () => {
        const isFit = pageSizeSelect.value === 'fit';
        document.getElementById('layout-group').style.display = isFit ? 'none' : 'flex';
        document.getElementById('orientation-group').style.display = isFit ? 'none' : 'flex';
    };
    pageSizeSelect.addEventListener('change', updateLayoutVisibility);

    // --- REPROCESS LOGIC ---
    // If user changes a dropdown after seeing the reprocess button, we just highlight the status
    [pageSizeSelect, pageLayoutSelect, pageOrientationSelect].forEach(el => {
        el.addEventListener('change', () => {
            if (reprocessBtn.style.display === 'inline-flex') {
                statusMsg.textContent = "Settings changed. Click 'Reprocess' to update your PDF.";
                statusMsg.style.color = "#d9534f"; // Give it a warning color
            }
        });
    });

    async function handleFiles(files) {
        const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
        for (const file of valid) {
            const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await VerticonDB.saveFile(id, file);
            filesArray.push({ id, name: file.name, thumb: URL.createObjectURL(file) });
        }
        renderImages();
        updateUI();
    }

    function renderImages() {
        imageListEl.innerHTML = '';
        filesArray.forEach(f => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.innerHTML = `<img src="${f.thumb}" class="image-preview"><button onclick="removeImage('${f.id}')" class="remove-btn material-icons">close</button>`;
            imageListEl.appendChild(card);
        });
    }

    window.removeImage = async (id) => {
        const i = filesArray.findIndex(f => f.id === id);
        URL.revokeObjectURL(filesArray[i].thumb);
        await VerticonDB.deleteFile(id);
        filesArray.splice(i, 1);
        renderImages();
        updateUI();
    };

    function updateUI() {
        const hasFiles = filesArray.length > 0;
        convertBtn.disabled = !hasFiles;
        clearBtn.style.display = hasFiles ? 'inline-flex' : 'none';
        if (!hasFiles) {
            statusMsg.textContent = "Add images to begin.";
            statusMsg.style.color = "";
            reprocessBtn.style.display = 'none';
            downloadLink.style.display = 'none';
            convertNewBtn.style.display = 'none';
            convertBtn.style.display = 'inline-flex';
        } else {
            statusMsg.textContent = `${filesArray.length} image(s) ready.`;
        }
    }

    clearBtn.addEventListener('click', async () => {
        if (!confirm("Clear all?")) return;
        await VerticonDB.clearStore();
        filesArray.forEach(f => URL.revokeObjectURL(f.thumb));
        filesArray.length = 0;
        renderImages();
        updateUI();
    });

    // Unified function for Convert & Reprocess
    const generatePDF = async () => {
        try {
            statusMsg.textContent = "Processing PDF...";
            statusMsg.style.color = "";
            convertBtn.disabled = true;
            reprocessBtn.disabled = true;

            const pdfDoc = await PDFLib.PDFDocument.create();
            for (const f of filesArray) {
                const blob = await VerticonDB.getFile(f.id);
                const bytes = await blob.arrayBuffer();
                const img = blob.type.includes('png') ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
                
                // Page Logic
                let pw, ph, [bw, bh] = PAGE_SIZES[pageSizeSelect.value] || [img.width, img.height];
                if (pageSizeSelect.value !== 'fit') {
                    const orient = pageOrientationSelect.value;
                    if ((orient==='portrait' && bw > bh) || (orient==='landscape' && bh > bw)) [bw, bh] = [bh, bw];
                    pw = bw; ph = bh;
                } else { pw = img.width; ph = img.height; }

                const scale = Math.min(pw / img.width, ph / img.height);
                const w = pageLayoutSelect.value === 'stretch' ? pw : img.width * scale;
                const h = pageLayoutSelect.value === 'stretch' ? ph : img.height * scale;
                pdfDoc.addPage([pw, ph]).drawImage(img, { x: (pw-w)/2, y: (ph-h)/2, width: w, height: h });
            }

            const url = URL.createObjectURL(new Blob([await pdfDoc.save()], { type: 'application/pdf' }));
            downloadLink.href = url;
            downloadLink.download = `verticon_${Date.now()}.pdf`;

            // UI Switch
            convertBtn.style.display = 'none';
            reprocessBtn.style.display = 'inline-flex';
            reprocessBtn.disabled = false;
            downloadLink.style.display = 'inline-flex';
            convertNewBtn.style.display = 'inline-flex';
            statusMsg.textContent = "Conversion complete!";
        } catch (e) {
            statusMsg.textContent = "Error during conversion.";
            reprocessBtn.disabled = false;
        }
    };

    convertBtn.addEventListener('click', generatePDF);
    reprocessBtn.addEventListener('click', generatePDF);
    convertNewBtn.onclick = () => location.reload();
    fileInput.onchange = (e) => handleFiles(e.target.files);
});
