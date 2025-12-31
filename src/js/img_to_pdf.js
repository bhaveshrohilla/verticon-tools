document.addEventListener('DOMContentLoaded', () => {
    
    // --- Constants ---
    const IMAGE_PREVIEW_LIMIT = 5;
    const PAGE_SIZES = {
        'A4':  [595.28, 841.89],
        'Letter': [612, 792],
        'Legal':  [612, 1008]
    };
    
    // --- State Management ---
    const filesArray = [];
    let hasConverted = false;
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const imageListEl = document.getElementById('image-list');
    const convertBtn = document.getElementById('convert-btn');
    const statusMsg = document.getElementById('status-msg');
    const downloadLink = document.getElementById('download-link');
    const clearBtn = document.getElementById('clear-btn');
    const convertNewBtn = document.getElementById('convert-new-btn');
    const reconvertBtn = document.getElementById('reconvert-btn');
    
    // Settings Elements
    const pageSizeSelect = document.getElementById('page-size');
    const layoutGroup = document.getElementById('layout-group');
    const pageLayoutSelect = document.getElementById('page-layout');
    const orientationGroup = document.getElementById('orientation-group');
    const pageOrientationSelect = document.getElementById('page-orientation');

    let isExpanded = false;

    // --- Utility Functions ---
    const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || navigator.vendor || window.opera || '');
    
    function generateUniqueId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return `img_${crypto.randomUUID()}`;
        }
        return `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    async function normalizeImageOrientation(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img. onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img. height;
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, file.type, 1.0);
                };
                img.onerror = () => resolve(file);
                img.src = e.target. result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    }

    // --- Initialization ---
    if (pageSizeSelect) {
        pageSizeSelect.value = 'A4';
        updateLayoutVisibility();
    }

    VerticonDB.clearStore().catch((err) => {
        console.error('Failed to clear store on init:', err);
    });

    // --- Event Listeners:  Drag & Drop ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer. files);
    });

    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput && e.target. tagName !== 'BUTTON') {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // --- Event Listeners: Settings ---
    pageSizeSelect. addEventListener('change', () => {
        updateLayoutVisibility();
        handleSettingChange();
    });

    if (pageOrientationSelect) {
        pageOrientationSelect.addEventListener('change', handleSettingChange);
    }

    if (pageLayoutSelect) {
        pageLayoutSelect.addEventListener('change', handleSettingChange);
    }

    function updateLayoutVisibility() {
        const isFitMode = pageSizeSelect.value === 'fit';
        layoutGroup.style.display = isFitMode ? 'none' : 'flex';
        if (orientationGroup) {
            orientationGroup.style.display = isFitMode ? 'none' :  'flex';
        }
    }

    function handleSettingChange() {
        if (hasConverted) {
            downloadLink.style.display = 'none';
            if (reconvertBtn) {
                reconvertBtn.style.display = 'inline-flex';
            }
            statusMsg.textContent = 'Settings changed. Click Reconvert to generate a new PDF with updated settings.';
        }
    }

    // --- File Handling ---
    async function handleFiles(files) {
        if (! files || files.length === 0) return;

        downloadLink.style.display = 'none';
        convertBtn.style.display = 'inline-flex';
        
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            statusMsg.textContent = 'No valid image files selected. ';
            return;
        }

        try {
            for (const file of validFiles) {
                const id = generateUniqueId();
                const normalizedFile = await normalizeImageOrientation(file);
                
                await VerticonDB.saveFile(id, normalizedFile);
                
                const thumbUrl = URL.createObjectURL(normalizedFile);
                
                const meta = {
                    id: id,
                    name: file.name,
                    type: file.type,
                    thumb: thumbUrl
                };
                filesArray.push(meta);
            }
            
            renderImages();
            updateUI();
        } catch (err) {
            console.error('Error handling files:', err);
            statusMsg.textContent = 'Error processing some images. ';
        }
    }

    // --- Rendering ---
    function renderImages() {
        imageListEl.innerHTML = '';
        
        const limit = isExpanded ? filesArray. length : IMAGE_PREVIEW_LIMIT;
        const visibleItems = filesArray.slice(0, limit);

        visibleItems.forEach((fileMeta) => {
            const item = document.createElement('div');
            item.className = 'image-card';
            item.innerHTML = `
                <img src="${fileMeta.thumb}" class="image-preview" alt="${escapeHtml(fileMeta. name)}" loading="lazy">
                <div class="image-name" title="${escapeHtml(fileMeta.name)}">${escapeHtml(fileMeta.name)}</div>
                <button class="remove-btn material-icons" aria-label="Remove ${escapeHtml(fileMeta.name)}" type="button">close</button>
            `;
            
            const removeBtn = item.querySelector('.remove-btn');
            removeBtn. addEventListener('click', async (e) => {
                e.stopPropagation();
                await removeImage(fileMeta.id);
            });

            imageListEl.appendChild(item);
        });

        if (! isExpanded && filesArray.length > IMAGE_PREVIEW_LIMIT) {
            const moreCard = document.createElement('div');
            moreCard.className = 'image-card more-card';
            moreCard.setAttribute('role', 'button');
            moreCard.setAttribute('tabindex', '0');
            moreCard.innerHTML = `
                <span class="material-icons" style="font-size: 2rem; color: var(--text-muted);">more_horiz</span>
                <div style="font-size: 0.9rem; color: var(--text-muted);">View All (+${filesArray.length - IMAGE_PREVIEW_LIMIT})</div>
            `;
            
            const expandList = () => {
                isExpanded = true;
                renderImages();
            };
            
            moreCard.addEventListener('click', expandList);
            moreCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    expandList();
                }
            });
            
            imageListEl.appendChild(moreCard);
        }
    }

    async function removeImage(id) {
        const index = filesArray.findIndex(f => f.id === id);
        if (index === -1) return;

        try {
            const fileMeta = filesArray[index];
            
            if (fileMeta.thumb) {
                try {
                    URL.revokeObjectURL(fileMeta.thumb);
                } catch (err) {
                    console.warn('Failed to revoke object URL:', err);
                }
            }
            
            await VerticonDB.deleteFile(id);
            filesArray.splice(index, 1);
            
            renderImages();
            updateUI();
        } catch (err) {
            console.error('Error removing image:', err);
            statusMsg.textContent = 'Error removing image.';
        }
    }

    function updateUI() {
        if (filesArray.length > 0) {
            convertBtn.disabled = false;
            if (clearBtn) clearBtn.style.display = 'inline-flex';
            if (convertNewBtn) convertNewBtn.style.display = 'none';
            statusMsg.textContent = `${filesArray.length} image${filesArray.length > 1 ?  's' : ''} ready to convert. `;
        } else {
            convertBtn.disabled = true;
            if (clearBtn) clearBtn.style.display = 'none';
            if (convertNewBtn) convertNewBtn.style.display = 'none';
            statusMsg.textContent = 'Add images to begin. ';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Clear All ---
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (filesArray.length === 0) return;
            if (! confirm('Clear all images?  This cannot be undone.')) return;

            try {
                await VerticonDB.clearStore();
                
                filesArray.forEach(f => {
                    if (f.thumb) {
                        try {
                            URL.revokeObjectURL(f.thumb);
                        } catch (err) {
                            console.warn('Failed to revoke URL:', err);
                        }
                    }
                });
                
                filesArray.length = 0;
                renderImages();
                downloadLink.style.display = 'none';
                convertBtn.style. display = 'inline-flex';
                convertBtn.disabled = true;
                statusMsg.textContent = 'All images cleared.';
                updateUI();
            } catch (err) {
                console.error('Error clearing images:', err);
                statusMsg. textContent = 'Error clearing images.';
            }
        });
    }

    // --- Conversion Logic ---
    convertBtn.addEventListener('click', async () => {
        if (filesArray.length === 0) return;

        try {
            convertBtn.disabled = true;
            convertBtn.innerHTML = `<span class="material-icons spin">sync</span> Converting...`;
            statusMsg.textContent = 'Processing images...';

            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument. create();
            
            const pageSize = pageSizeSelect.value;
            const layoutMode = pageLayoutSelect.value;
            
            let processedCount = 0;
            
            for (const fileMeta of filesArray) {
                try {
                    const file = await VerticonDB.getFile(fileMeta.id);
                    if (!file) {
                        console.warn(`File not found: ${fileMeta. name}`);
                        continue;
                    }
                    
                    const arrayBuffer = await file.arrayBuffer();
                    let image;
                    
                    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                        image = await pdfDoc.embedJpg(arrayBuffer);
                    } else if (file.type === 'image/png') {
                        image = await pdfDoc. embedPng(arrayBuffer);
                    }

                    if (image) {
                        addImageToPage(pdfDoc, image, pageSize, layoutMode);
                        processedCount++;
                    }
                } catch (err) {
                    console.error(`Error processing ${fileMeta.name}:`, err);
                }
            }

            if (processedCount === 0) {
                throw new Error('No images could be processed.');
            }

            const pdfBytes = await pdfDoc. save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL. createObjectURL(blob);

            downloadLink.href = url;
            downloadLink.download = `verticon_images_${Date.now()}.pdf`;
            
            hasConverted = true;
            convertBtn.style.display = 'none';
            downloadLink.style.display = 'inline-flex';
            if (reconvertBtn) reconvertBtn.style.display = 'none';
            if (convertNewBtn) convertNewBtn.style.display = 'inline-flex';
            statusMsg. textContent = `Conversion complete! ${processedCount} of ${filesArray.length} images processed.`;

        } catch (error) {
            console.error('Conversion error:', error);
            statusMsg.textContent = `Error: ${error.message || 'Failed to convert images.'}`;
            convertBtn.innerHTML = `<span class="material-icons">picture_as_pdf</span> Convert to PDF`;
            convertBtn.disabled = false;
        }
    });

    // --- Reconvert Logic ---
    if (reconvertBtn) {
        reconvertBtn.addEventListener('click', async () => {
            if (filesArray.length === 0) return;

            try {
                // Revoke old PDF URL if it exists
                if (downloadLink && downloadLink.href) {
                    try {
                        URL.revokeObjectURL(downloadLink.href);
                    } catch (err) {
                        console.warn('Failed to revoke download URL:', err);
                    }
                }

                reconvertBtn.disabled = true;
                reconvertBtn.innerHTML = `<span class="material-icons spin">sync</span> Reconverting...`;
                statusMsg.textContent = 'Processing images with new settings...';

                const { PDFDocument } = PDFLib;
                const pdfDoc = await PDFDocument.create();
                
                const pageSize = pageSizeSelect.value;
                const layoutMode = pageLayoutSelect.value;
                
                let processedCount = 0;
                
                for (const fileMeta of filesArray) {
                    try {
                        const file = await VerticonDB.getFile(fileMeta.id);
                        if (!file) {
                            console.warn(`File not found: ${fileMeta.name}`);
                            continue;
                        }
                        
                        const arrayBuffer = await file.arrayBuffer();
                        let image;
                        
                        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                            image = await pdfDoc.embedJpg(arrayBuffer);
                        } else if (file.type === 'image/png') {
                            image = await pdfDoc.embedPng(arrayBuffer);
                        }

                        if (image) {
                            addImageToPage(pdfDoc, image, pageSize, layoutMode);
                            processedCount++;
                        }
                    } catch (err) {
                        console.error(`Error processing ${fileMeta.name}:`, err);
                    }
                }

                if (processedCount === 0) {
                    throw new Error('No images could be processed.');
                }

                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                downloadLink.href = url;
                downloadLink.download = `verticon_images_${Date.now()}.pdf`;
                
                reconvertBtn.style.display = 'none';
                downloadLink.style.display = 'inline-flex';
                statusMsg.textContent = `Reconversion complete! ${processedCount} of ${filesArray.length} images processed.`;

            } catch (error) {
                console.error('Reconversion error:', error);
                statusMsg.textContent = `Error: ${error.message || 'Failed to reconvert images.'}`;
                reconvertBtn.innerHTML = `<span class="material-icons">autorenew</span> Reconvert`;
                reconvertBtn.disabled = false;
            }
        });
    }

    function addImageToPage(pdfDoc, image, pageSize, layoutMode) {
        let pageWidth, pageHeight;
        let x = 0, y = 0, w = image.width, h = image.height;

        if (pageSize === 'fit') {
            pageWidth = image.width;
            pageHeight = image.height;
        } else {
            let [baseWidth, baseHeight] = PAGE_SIZES[pageSize];

            const orientationPref = pageOrientationSelect ?  pageOrientationSelect.value :  'auto';
            const isPortrait = image.height > image.width;

            if (orientationPref === 'portrait') {
                if (baseWidth > baseHeight) {
                    [baseWidth, baseHeight] = [baseHeight, baseWidth];
                }
            } else if (orientationPref === 'landscape') {
                if (baseHeight > baseWidth) {
                    [baseWidth, baseHeight] = [baseHeight, baseWidth];
                }
            } else {
                if (isPortrait && baseWidth > baseHeight) {
                    [baseWidth, baseHeight] = [baseHeight, baseWidth];
                } else if (!isPortrait && baseHeight > baseWidth) {
                    [baseWidth, baseHeight] = [baseHeight, baseWidth];
                }
            }

            pageWidth = baseWidth;
            pageHeight = baseHeight;

            if (layoutMode === 'stretch') {
                w = pageWidth;
                h = pageHeight;
            } else {
                const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
                w = image.width * scale;
                h = image.height * scale;
                x = (pageWidth - w) / 2;
                y = (pageHeight - h) / 2;
            }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, { x, y, width: w, height: h });
    }

    // --- Convert New ---
    if (convertNewBtn) {
        convertNewBtn.addEventListener('click', async () => {
            try {
                if (downloadLink && downloadLink.href) {
                    try {
                        URL.revokeObjectURL(downloadLink.href);
                    } catch (err) {
                        console.warn('Failed to revoke download URL:', err);
                    }
                }

                await VerticonDB.clearStore();
                
                filesArray.forEach(f => {
                    if (f.thumb) {
                        try {
                            URL. revokeObjectURL(f. thumb);
                        } catch (err) {
                            console. warn('Failed to revoke URL:', err);
                        }
                    }
                });
                
                filesArray.length = 0;
                renderImages();

                hasConverted = false;
                downloadLink.style.display = 'none';
                downloadLink.href = '';
                if (clearBtn) clearBtn.style.display = 'none';
                convertNewBtn.style.display = 'none';
                if (reconvertBtn) reconvertBtn.style.display = 'none';
                convertBtn.style.display = 'inline-flex';
                convertBtn.disabled = true;
                statusMsg.textContent = 'Ready for new images.';
                convertBtn.innerHTML = `<span class="material-icons">picture_as_pdf</span> Convert to PDF`;
                
                isExpanded = false;
                if (pageSizeSelect) {
                    pageSizeSelect. value = 'A4';
                    updateLayoutVisibility();
                }
                
                updateUI();

                if (fileInput) {
                    fileInput.value = '';
                    if (! isMobileDevice()) {
                        try {
                            fileInput.click();
                        } catch (err) {
                            console.warn('Could not open file selector:', err);
                        }
                    }
                }
            } catch (err) {
                console.error('Error resetting:', err);
                statusMsg.textContent = 'Error resetting for new conversion.';
            }
        });
    }
});
