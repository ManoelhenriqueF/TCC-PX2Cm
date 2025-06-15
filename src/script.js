let jspdf;

const fileInput = document.getElementById('file-upload');
const dropArea = document.getElementById('file-upload-label');
const downloadBtn = document.getElementById('download-button');
const previewContainer = document.getElementById('preview-container');
const imageResized = document.getElementById('image-resized');
const errorMessage = document.getElementById('error-message');
const keepAspectCheckbox = document.getElementById('keep-aspect-ratio');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const uploadContainer = document.querySelector('.upload-section');

let originalImage = null;
let originalAspectRatio = 1;

const translations = {
  pt: {
    title: "REDIMENSIONE SUAS IMAGENS COM PRECISÃO PARA IMPRESSÃO PERFEITA!",
    uploadLabel: "SELECIONE<br>OU ARRASTE<br>O ARQUIVO",
    width: "Largura",
    height: "Altura",
    dpi: "DPI",
    unit: "Unidade",
    paperSize: "Tamanho do Papel",
    quantityPerPage: "Quantidade por página",
    outputFormat: "Formato de Saída",
    borderColor: "Cor da linha de contorno",
    black: "Preto",
    white: "Branco",
    addPageBorder: "Adicionar borda na página",
    keepAspectRatio: "Ajustar automaticamente a proporção",
    invalidFile: "Tipo de arquivo inválido. Apenas PNG e JPG são aceitos.",
    download: "DOWNLOAD"
  },
  en: {
    title: "RESIZE YOUR IMAGES WITH PRECISION FOR PERFECT PRINTING!",
    uploadLabel: "SELECT<br>OR DRAG<br>THE FILE",
    width: "Width",
    height: "Height",
    dpi: "DPI",
    unit: "Unit",
    paperSize: "Paper Size",
    quantityPerPage: "Quantity per page",
    outputFormat: "Output Format",
    borderColor: "Border color",
    black: "Black",
    white: "White",
    addPageBorder: "Add page border",
    keepAspectRatio: "Maintain aspect ratio automatically",
    invalidFile: "Invalid file type. Only PNG and JPG are accepted.",
    download: "DOWNLOAD"
  }
};

const paperOptions = {
  pt: {
    A5: "Folha A5 (14.8 × 21 cm)",
    A4: "Folha A4 (21 × 29.7 cm)",
    A3: "Folha A3 (29.7 × 42 cm)"
  },
  en: {
    A5: "A5 Sheet (14.8 × 21 cm)",
    A4: "A4 Sheet (21 × 29.7 cm)",
    A3: "A3 Sheet (29.7 × 42 cm)"
  }
};

function updateLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (element.tagName === 'INPUT' && element.type === 'placeholder') {
        element.placeholder = translations[lang][key];
      } else if (element.tagName === 'OPTION') {
        element.textContent = translations[lang][key];
      } else {
        element.innerHTML = translations[lang][key];
      }
    }
  });

  const paperSelect = document.getElementById('paper-size');
  Array.from(paperSelect.options).forEach(option => {
    option.textContent = paperOptions[lang][option.value];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  jspdf = window.jspdf;
  
  updateLanguage('pt');
  
  document.getElementById('language-selector').addEventListener('change', (e) => {
    updateLanguage(e.target.value);
  });

  fileInput.addEventListener('change', validateFile);
  downloadBtn.addEventListener('click', downloadImage);
  document.getElementById('unit-select').addEventListener('change', convertUnits);

  document.getElementById('dpi').addEventListener('input', function() {
    const dpi = parseInt(this.value);
    if (dpi < 72) this.value = 72;
    if (dpi > 1200) this.value = 1200;
    updateResizedPreview();
  });
  
  widthInput.addEventListener('input', function() {
    if (keepAspectCheckbox.checked) {
      adjustOppositeDimension('width');
    }
    updateResizedPreview();
  });
  
  heightInput.addEventListener('input', function() {
    if (keepAspectCheckbox.checked) {
      adjustOppositeDimension('height');
    }
    updateResizedPreview();
  });
  
  keepAspectCheckbox.addEventListener('change', function() {
    if (this.checked && originalImage) {
      adjustOppositeDimension('width');
    }
    updateResizedPreview();
  });

 
  document.getElementById('file-upload-label').addEventListener('click', function(e) {
    if (e.target.tagName !== 'INPUT') {
      fileInput.click();
    }
  });
});

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});

['dragleave', 'dragend'].forEach(type => {
  dropArea.addEventListener(type, () => {
    dropArea.classList.remove('dragover');
  });
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const files = e.dataTransfer.files;
    if (files.length > 1) {
      showError('Apenas um arquivo por vez é permitido');
      return;
    }
    fileInput.files = files;
    validateFile({ target: fileInput });
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

function adjustOppositeDimension(changedInput) {
  if (!keepAspectCheckbox.checked || !originalImage) return;
  
  if (changedInput === 'width') {
    const newWidth = parseFloat(widthInput.value);
    if (!isNaN(newWidth)) {
      heightInput.value = (newWidth / originalAspectRatio).toFixed(2);
    }
  } else {
    const newHeight = parseFloat(heightInput.value);
    if (!isNaN(newHeight)) {
      widthInput.value = (newHeight * originalAspectRatio).toFixed(2);
    }
  }
}

function updateResizedPreview() {
  if (!originalImage) return;
  
  const dpi = parseInt(document.getElementById('dpi').value) || 300;
  const unit = document.getElementById('unit-select').value;
  let width = parseFloat(widthInput.value) || 0;
  let height = parseFloat(heightInput.value) || 0;

  if (unit === 'mm') {
    width /= 10;
    height /= 10;
  } else if (unit === 'in') {
    width *= 2.54;
    height *= 2.54;
  }

  const widthPx = width / 2.54 * dpi;
  const heightPx = height / 2.54 * dpi;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = widthPx;
  canvas.height = heightPx;
  
  ctx.drawImage(originalImage, 0, 0, widthPx, heightPx);
  
  imageResized.src = canvas.toDataURL();
}

function cmTo(unit, value) {
  if (unit === 'cm') return value;
  if (unit === 'mm') return value * 10;
  if (unit === 'in') return value / 2.54;
}

function convertUnits() {
  const unit = document.getElementById('unit-select').value;
  const dpi = parseFloat(document.getElementById('dpi').value) || 300;
  const file = fileInput.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = function() {
    const widthCm = img.width / dpi * 2.54;
    const heightCm = img.height / dpi * 2.54;
    
    originalAspectRatio = img.width / img.height;
    
    widthInput.value = cmTo(unit, widthCm).toFixed(2);
    heightInput.value = cmTo(unit, heightCm).toFixed(2);
    
    if (previewContainer.style.display === 'block') {
      updateResizedPreview();
    }
    
    URL.revokeObjectURL(img.src);
  };
}

function validateFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    showError('Tipo de arquivo inválido. Apenas PNG e JPG são aceitos.');
    fileInput.value = '';
    downloadBtn.disabled = true;
    previewContainer.style.display = 'none';
    return;
  }

  errorMessage.style.display = 'none';
  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = function() {
    originalImage = img;
    originalAspectRatio = img.width / img.height;
    previewContainer.style.display = 'block';
    downloadBtn.disabled = false;
    
    convertUnits();
  };
  
  img.onerror = function() {
    showError('Erro ao carregar a imagem');
    fileInput.value = '';
    downloadBtn.disabled = true;
    previewContainer.style.display = 'none';
  };
}

function getPaperDimensions(size, dpi) {
  const dims = {
    A5: [1748, 2480],
    A4: [2480, 3508],
    A3: [3508, 4960]
  };
  const scale = dpi / 300;
  return [Math.round(dims[size][0] * scale), Math.round(dims[size][1] * scale)];
}

function downloadImage() {
  const file = fileInput.files[0];
  const dpi = parseFloat(document.getElementById('dpi').value) || 300;
  const unit = document.getElementById('unit-select').value;
  let width = parseFloat(widthInput.value) || 0;
  let height = parseFloat(heightInput.value) || 0;
  const paper = document.getElementById('paper-size').value;
  const quantity = parseInt(document.getElementById('img-per-page').value) || 1;
  const fileType = document.getElementById('file-type').value;
  const borderColor = document.getElementById('border-color').value;
  const addPageBorder = document.getElementById('add-page-border').checked;
  const keepAspect = keepAspectCheckbox.checked;

  if (!file) {
    showError('Selecione uma imagem primeiro');
    return;
  }

  if (width <= 0 || height <= 0) {
    showError('Altura e largura devem ser maiores que zero');
    return;
  }

  if (unit === 'mm') {
    width /= 10;
    height /= 10;
  } else if (unit === 'in') {
    width *= 2.54;
    height *= 2.54;
  }

  const widthPx = width / 2.54 * dpi;
  const heightPx = height / 2.54 * dpi;

  const [paperW, paperH] = getPaperDimensions(paper, dpi);

  const img = new Image();
  img.src = originalImage.src;
  img.onload = function() {
    let finalWidthPx = widthPx;
    let finalHeightPx = heightPx;
    
    if (keepAspect) {
      const aspectTarget = widthPx / heightPx;
      
      if (aspectTarget > originalAspectRatio) {
        finalWidthPx = heightPx * originalAspectRatio;
        finalHeightPx = heightPx;
      } else {
        finalWidthPx = widthPx;
        finalHeightPx = widthPx / originalAspectRatio;
      }
    }

    const pagePadding = 2 / 25.4 * dpi;
    const usableWidth = paperW - 2 * pagePadding;
    const usableHeight = paperH - 2 * pagePadding;

    const cols = Math.max(1, Math.floor(usableWidth / finalWidthPx));
    const rows = Math.max(1, Math.floor(usableHeight / finalHeightPx));
    const maxImages = cols * rows;

    if (quantity > maxImages) {
      showError(`Quantidade máxima para este papel e tamanho é ${maxImages}`);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = paperW;
    canvas.height = paperH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = addPageBorder ? borderColor : "#fff";
    ctx.fillRect(0, 0, paperW, paperH);

    if (addPageBorder) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(pagePadding, pagePadding, usableWidth, usableHeight);
    }

    let count = 0;
    outerLoop:
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (count >= quantity) break outerLoop;
        
        const x = pagePadding + c * finalWidthPx;
        const y = pagePadding + r * finalHeightPx;

        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, finalWidthPx, finalHeightPx);
        ctx.drawImage(img, x, y, finalWidthPx, finalHeightPx);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, finalWidthPx, finalHeightPx);

        count++;
      }
    }

    if (fileType === "pdf") {
      const pdf = new jspdf.jsPDF({
        unit: 'pt',
        format: [paperW * 72 / dpi, paperH * 72 / dpi]
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, paperW * 72 / dpi, paperH * 72 / dpi);
      pdf.save('imagem.pdf');
    } else {
      const link = document.createElement('a');
      link.download = `imagem.${fileType}`;
      link.href = canvas.toDataURL(`image/${fileType}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  img.onerror = function() {
    showError('Erro ao processar a imagem');
  };
}