document.addEventListener('DOMContentLoaded', () => {

    // Select all navigation buttons and links using a common class
    // This allows us to handle both buttons and anchor tags with the same logic
    const navItems = document.querySelectorAll('.internal-nav-link');

    // Get the current page's filename from the URL (e.g., 'pyvariables.html')
    const currentPage = window.location.pathname.split('/').pop();

    // Loop through all the navigation items to set up event listeners and highlighting
    navItems.forEach(item => {
        // Get the target URL from either data-target or href attribute
        const targetUrl = item.getAttribute('data-target');

        // Check if the item's target matches the current page's filename
        if (targetUrl && targetUrl.endsWith(currentPage)) {
            item.classList.add('active');
        }

        // Add a click event listener for navigation
        // This is only necessary for buttons, as anchor tags handle it natively
        if (item.tagName === 'BUTTON') {
            item.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default form submission behavior for buttons
                if (targetUrl) {
                    window.location.href = targetUrl;
                }
            });
        }
    });

    // Handle "Previous" and "Next" buttons
    const prevButton = document.querySelector('.prev-topic-button');
    const nextButton = document.querySelector('.next-topic-button');

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            const prevUrl = prevButton.getAttribute('data-target');
            if (prevUrl) {
                window.location.href = prevUrl;
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const nextUrl = nextButton.getAttribute('data-target');
            if (nextUrl) {
                window.location.href = nextUrl;
            }
        });
    }
});

//plot generation code
const pyodideReadyPromise = loadPyodide();

async function runPython() {
  const code = document.getElementById("code").value.trim();
  const output = document.getElementById("output");

  // Reset UI
  output.innerHTML = "<em>⏳ Running...</em>";

  if (!code) {
    output.innerHTML = "<span>Please enter some Python code to run.</span>";
    return;
  }

  try {
    const pyodide = await pyodideReadyPromise;
      // Load micropip and install seaborn
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("seaborn");


    // Redirect stdout and stderr
    pyodide.runPython(`
      import sys
      class OutputCatcher:
          def __init__(self):
              self.data = ""
          def write(self, s): self.data += s
          def flush(self): pass
      catcher = OutputCatcher()
      sys.stdout = catcher
      sys.stderr = catcher
    `);

    await pyodide.loadPackage(['matplotlib', 'numpy', 'pandas']);
    await pyodide.runPythonAsync(`import matplotlib.pyplot as plt; plt.close('all')`);

    // Run user code
    await pyodide.runPythonAsync(code);

    // Detect plotting libraries
    const usesPlotLib = /matplotlib|seaborn/.test(code);

    let imgBase64 = null;

    if (usesPlotLib) {
      await pyodide.runPythonAsync(`
        import base64
        from io import BytesIO
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
      `);

      imgBase64 = pyodide.runPython("img_base64");
    }

    // Display output line by line
    const result = pyodide.runPython("catcher.data");
    const lines = result.split('\n').filter(line => line.trim() !== "");
    output.innerHTML = "";

    if (lines.length > 0) {
      lines.forEach(line => {
        const div = document.createElement("div");
        div.textContent = line;
        output.appendChild(div);
      });
    }

    // Append plot image directly to output
    if (imgBase64) {
      const img = document.createElement("img");
      img.src = "data:image/png;base64," + imgBase64;
      img.alt = "Generated Plot";
      img.style.marginTop = "0rem";
      img.style.maxWidth = "100%";
      img.style.maxHeight="100%";
      output.appendChild(img);
    }

    if (lines.length === 0 && !imgBase64) {
      output.innerHTML = "<span>✅ Code executed!</span>";
    }

  } catch (err) {
    output.innerHTML = `<pre>❌ Error:\n${err}</pre>`;
  }
}

// Include these in your HTML separately:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

const fileInput = document.getElementById('fileUpload');
const submitBtn = document.getElementById('submit');
let uploadedFile = null;

fileInput.addEventListener('change', () => {
  uploadedFile = fileInput.files[0];
});

submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!uploadedFile) {
    alert('Please select a file first.');
    return;
  }

  const fileName = uploadedFile.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const csvText = e.target.result;
      const encoded = new TextEncoder().encode(csvText);
      pyodide.FS.writeFile('data.csv', encoded);
      await pyodide.runPythonAsync(`
import pandas as pd
df = pd.read_csv("data.csv")
print(df.head())
      `);
    };
    reader.readAsText(uploadedFile);
  }

  else if (fileName.endsWith('.xlsx')) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const data = new Uint8Array(e.target.result);
      pyodide.FS.writeFile('data.xlsx', data);
      await pyodide.runPythonAsync(`
import pandas as pd
df = pd.read_excel("data.xlsx")
print(df.head())
      `);
    };
    reader.readAsArrayBuffer(uploadedFile);
  }

  else {
    alert('Unsupported file type. Please upload a .csv or .xlsx file.');
  }
});



// Sidebar toggle for mobile
var sidebarToggleBtn = document.getElementById('sidebar-toggle');
var internalsidebar = document.getElementById('internalsidebar');
sidebarToggleBtn.onclick = function() {
    internalsidebar.classList.toggle('active');
    if (internalsidebar.classList.contains('active')) {
        sidebarToggleBtn.style.setProperty('display', 'none', 'important');
    }
};
// Optional: close sidebar when clicking outside (mobile UX)
document.addEventListener('click', function(e) {
    if (internalsidebar.classList.contains('active') && !internalsidebar.contains(e.target) && e.target !== sidebarToggleBtn) {
        internalsidebar.classList.remove('active');
        sidebarToggleBtn.style.setProperty('display', 'block', 'important');
    }
});



