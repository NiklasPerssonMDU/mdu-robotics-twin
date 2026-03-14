document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('graph');
    const courseInfoPanel = document.getElementById('course-info');
    const btnRecenter = document.getElementById('btn-recenter');

    let network = null;
    let nodesData = null;
    let edgesData = null;

    // Year to Color Mapping
    const yearColors = {
        1: { background: '#10b981', border: '#059669' }, // Green
        2: { background: '#3b82f6', border: '#2563eb' }, // Blue
        3: { background: '#8b5cf6', border: '#7c3aed' }, // Purple
        4: { background: '#f59e0b', border: '#d97706' }, // Orange
        5: { background: '#ef4444', border: '#dc2626' }  // Red
    };

    // Initialize Network
    async function initGraph() {
        try {
            const response = await fetch('/api/graph');
            const data = await response.json();

            // Format nodes
            const formattedNodes = data.nodes.map(node => {
                const color = yearColors[node.group] || { background: '#cbd5e1', border: '#94a3b8' };
                return {
                    ...node,
                    color: {
                        background: color.background,
                        border: color.border,
                        highlight: {
                            background: '#ffffff',
                            border: color.border
                        },
                        hover: {
                            background: color.background,
                            border: '#ffffff'
                        }
                    },
                    margin: 10,
                    shadow: {
                        enabled: true,
                        color: 'rgba(0,0,0,0.4)',
                        size: 10,
                        x: 0,
                        y: 4
                    }
                };
            });

            // Format edges
            const formattedEdges = data.edges.map(edge => ({
                ...edge,
                color: { color: 'rgba(255,255,255,0.2)', highlight: '#60a5fa' },
                width: 2,
                smooth: { type: 'cubicBezier', forceDirection: 'none' }
            }));

            const selectDataNodes = data.nodes.slice().sort((a, b) => a.id.localeCompare(b.id));
            const selectPrereqs = document.getElementById('rc-prereqs');
            if (selectPrereqs) {
                selectPrereqs.innerHTML = '';
                selectDataNodes.forEach(node => {
                    const option = document.createElement('option');
                    option.value = node.id;
                    option.textContent = `${node.id} - ${node.label.split('\\n')[1] || ''}`;
                    selectPrereqs.appendChild(option);
                });
            }

            nodesData = new vis.DataSet(formattedNodes);
            edgesData = new vis.DataSet(formattedEdges);

            const graphData = {
                nodes: nodesData,
                edges: edgesData
            };

            const options = {
                nodes: {
                    borderWidth: 2,
                    borderWidthSelected: 4,
                    font: {
                        face: 'Inter',
                        size: 14,
                        multi: true,
                        bold: { size: 16 }
                    },
                    shapeProperties: {
                        borderRadius: 8
                    }
                },
                edges: {
                    arrows: { to: { enabled: true, scaleFactor: 0.8 } }
                },
                layout: {
                    hierarchical: {
                        enabled: true,
                        direction: 'UD', // Up-Down
                        sortMethod: 'directed',
                        nodeSpacing: 150,
                        levelSeparation: 150,
                    }
                },
                physics: {
                    enabled: false // Static hierarchical layout looks better for a curriculum
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 100,
                    zoomView: true,
                    dragView: true
                }
            };

            network = new vis.Network(container, graphData, options);

            // Handle Node Click
            network.on("selectNode", function (params) {
                const nodeId = params.nodes[0];
                selectedNodeId = nodeId;
                btnSimulate.disabled = false;
                btnSimulate.textContent = `Simulate Removal of ${nodeId}`;
                document.getElementById('impact-results').innerHTML = '';
                showCourseDetails(nodeId);
                resetGraphColors();
            });

            // Handle Deselect
            network.on("deselectNode", function (params) {
                if (params.nodes.length === 0) {
                    selectedNodeId = null;
                    if (btnSimulate) {
                        btnSimulate.disabled = true;
                        btnSimulate.textContent = 'Select a course to simulate';
                    }
                    document.getElementById('impact-results').innerHTML = '';
                    courseInfoPanel.innerHTML = '<div class="empty-state">Select a course in the graph to view details.</div>';
                    document.getElementById('course-actions').style.display = 'none';
                    resetGraphColors();

                    const replacePanel = document.getElementById('replace-course-panel');
                    if (replacePanel) replacePanel.style.display = 'none';
                }
            });

        } catch (error) {
            console.error('Error fetching graph data:', error);
            container.innerHTML = `<div class="empty-state" style="color:#ef4444;">Failed to load graph data. Make sure backend is running.</div>`;
        }
    }

    function showCourseDetails(nodeId) {
        const node = nodesData.get(nodeId);
        if (!node) return;

        // Parse title back to useful data (since we hackily stored it in title for tooltip)
        const code = node.id;
        const name = node.label.split('\n')[1] || '';
        const group = node.group;

        // Find prerequisites from edges
        const prereqs = edgesData.get({
            filter: function (item) {
                return item.from === nodeId;
            }
        });

        let reqHtml = '';
        if (prereqs.length > 0) {
            const reqItems = prereqs.map(edge => {
                const pNode = nodesData.get(edge.to);
                return `<li onclick="selectGraphNode('${pNode.id}')">${pNode.id} - ${pNode.label.split('\n')[1]}</li>`;
            }).join('');

            reqHtml = `
                <div class="c-reqs">
                    <h4>Prerequisites (Required)</h4>
                    <ul class="c-req-list">
                        ${reqItems}
                    </ul>
                </div>
            `;
        } else {
            reqHtml = `
                <div class="c-reqs">
                    <h4>Prerequisites</h4>
                    <span class="empty-state">No specific prerequisites</span>
                </div>
            `;
        }

        courseInfoPanel.innerHTML = `
            <div class="course-card">
                <div>
                    <div class="c-code" style="color: ${yearColors[group]?.background || '#fff'}">${code}</div>
                    <div class="c-name">${name}</div>
                </div>
                <div class="c-meta">
                    <span class="c-tag">Year ${group}</span>
                    <span class="c-tag" style="margin-left:auto">${node.title.replace('<br>', ' • ')}</span>
                </div>
                ${reqHtml}
            </div>
        `;

        const replacePanel = document.getElementById('replace-course-panel');
        if (replacePanel) {
            replacePanel.style.display = 'block';
            document.getElementById('rc-old-code').value = code;
            document.getElementById('rc-old-year').value = group;

            document.getElementById('rc-old-period').value = node.period || "";

            document.getElementById('rc-code').value = "";
            document.getElementById('rc-name').value = "";
            document.getElementById('rc-credits').value = "";
            document.getElementById('rc-year').value = group;
            document.getElementById('rc-warnings').innerHTML = "";

            const currentReqsIds = prereqs.map(e => e.to);
            const selectOptions = document.getElementById('rc-prereqs').options;
            for (let i = 0; i < selectOptions.length; i++) {
                selectOptions[i].selected = currentReqsIds.includes(selectOptions[i].value);
            }
        }

        document.getElementById('course-actions').style.display = 'block';
    }

    // Expose global function for sidebar links
    window.selectGraphNode = function (id) {
        if (network) {
            network.selectNodes([id]);
            network.focus(id, { scale: 1.0, animation: { duration: 500 } });
            showCourseDetails(id);
        }
    };

    btnRecenter.addEventListener('click', () => {
        if (network) {
            network.fit({ animation: { duration: 500 } });
        }
    });

    let selectedNodeId = null;
    const btnSimulate = document.getElementById('btn-simulate');

    function resetGraphColors() {
        if (!nodesData) return;
        const updates = nodesData.get().map(node => {
            const color = yearColors[node.group] || { background: '#cbd5e1', border: '#94a3b8' };
            return {
                id: node.id,
                color: {
                    background: color.background,
                    border: color.border,
                }
            };
        });
        nodesData.update(updates);
    }

    btnSimulate.addEventListener('click', async () => {
        if (!selectedNodeId) return;

        btnSimulate.disabled = true;
        btnSimulate.textContent = 'Simulating...';

        try {
            const res = await fetch(`/api/impact/${selectedNodeId}`);
            const data = await res.json();

            resetGraphColors();

            const updates = [];

            // Highlight target as removed (dark gray)
            updates.push({
                id: selectedNodeId,
                color: { background: '#475569', border: '#334155' }
            });

            // Highlight impacted nodes (red)
            data.impacted.forEach(course => {
                const existingNode = nodesData.get(course.code);
                if (existingNode) {
                    updates.push({
                        id: course.code,
                        color: { background: '#ef4444', border: '#991b1b' },
                        title: `BLOCKERAD: ${course.name}<br>Credits: ${existingNode.credits}<br>Period: ${existingNode.period}`
                    });
                }
            });

            nodesData.update(updates);

            // Show results in sidebar
            const impactPanel = document.getElementById('impact-results');
            if (data.impacted.length > 0) {
                impactPanel.innerHTML = `
                    <div class="c-reqs" style="margin-top:16px; border-top: 1px solid rgba(239,68,68,0.3); padding-top: 16px;">
                        <h4 style="color:#f87171">Impact: ${data.impacted.length} blocked courses</h4>
                        <ul class="c-req-list" style="margin-top: 8px;">
                            ${data.impacted.map(c => `
                                <li style="color:#fca5a5" onclick="selectGraphNode('${c.code}')">
                                    ${c.code} - ${c.name}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            } else {
                impactPanel.innerHTML = `
                    <div class="c-reqs" style="margin-top:16px; border-top: 1px solid rgba(16,185,129,0.3); padding-top: 16px;">
                        <h4 style="color:#34d399">No downstream impact</h4>
                        <span class="empty-state">Removing this course does not block any future courses.</span>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Simulation failed:', error);
        } finally {
            btnSimulate.disabled = false;
            btnSimulate.textContent = `Clear & Resimulate ${selectedNodeId}`;
        }
    });

    const btnSubmitReplace = document.getElementById('btn-submit-replace');
    if (btnSubmitReplace) {
        btnSubmitReplace.addEventListener('click', async () => {
            const oldCode = document.getElementById('rc-old-code').value;
            const oldYear = parseInt(document.getElementById('rc-old-year').value);
            const period = document.getElementById('rc-old-period').value;

            const code = document.getElementById('rc-code').value.trim();
            const name = document.getElementById('rc-name').value.trim();
            const year = parseInt(document.getElementById('rc-year').value);
            const creditsInput = document.getElementById('rc-credits').value;
            const credits = parseFloat(creditsInput);

            const select = document.getElementById('rc-prereqs');
            const prerequisites = Array.from(select.selectedOptions).map(opt => opt.value);

            const warningsDiv = document.getElementById('rc-warnings');
            warningsDiv.innerHTML = '';

            if (!code || !name || isNaN(credits)) {
                warningsDiv.innerHTML = 'Varning: Fyll i kod, namn och hp (credits).';
                return;
            }

            let totalYearCredits = 0;
            nodesData.get().forEach(node => {
                // If checking the year the new course is placed in
                if (node.group === year) {
                    // Don't count the old course if it happened to be in the same year
                    if (node.id !== oldCode) {
                        if (node.credits) totalYearCredits += node.credits;
                    }
                }
            });
            totalYearCredits += credits;

            if (totalYearCredits !== 60) {
                const proceed = confirm(`VARNING: År ${year} har nu totalt ${totalYearCredits} hp (borde vara 60 hp). Vill du ändå genomföra bytet?`);
                if (!proceed) return;
            }

            btnSubmitReplace.textContent = "Sparar...";
            btnSubmitReplace.disabled = true;

            try {
                const response = await fetch('/api/replace_course', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        old_code: oldCode,
                        code: code,
                        name: name,
                        credits: credits,
                        year: year,
                        period: period,
                        prerequisites: prerequisites
                    })
                });

                if (response.ok) {
                    const replacePanel = document.getElementById('replace-course-panel');
                    if (replacePanel) replacePanel.style.display = 'none';
                    initGraph();
                } else {
                    const err = await response.json();
                    warningsDiv.innerHTML = 'Något gick fel: ' + (err.detail || 'Backend error');
                }
            } catch (e) {
                warningsDiv.innerHTML = 'Nätverksfel.';
            } finally {
                btnSubmitReplace.textContent = "Byt ut kurs";
                btnSubmitReplace.disabled = false;
            }
        });
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            const proceed = confirm("Vill du återställa hela grafen till MDU:s original-kursplan?");
            if (!proceed) return;

            btnReset.style.opacity = "0.5";
            try {
                const response = await fetch('/api/reset', { method: 'POST' });
                if (response.ok) {
                    // Återställ UI-states
                    selectedNodeId = null;
                    if (btnSimulate) {
                        btnSimulate.disabled = true;
                        btnSimulate.textContent = 'Select a course to simulate';
                    }
                    const impactRes = document.getElementById('impact-results');
                    if (impactRes) impactRes.innerHTML = '';

                    courseInfoPanel.innerHTML = '<div class="empty-state">Select a course in the graph to view details.</div>';
                    const replacePanel = document.getElementById('replace-course-panel');
                    if (replacePanel) replacePanel.style.display = 'none';

                    // Ladda om grafen
                    initGraph();
                } else {
                    alert('Något gick fel vid återställningen av databasen.');
                }
            } catch (e) {
                alert('Nätverksfel vid återställning.');
            } finally {
                btnReset.style.opacity = "1";
            }
        });
    }

    const btnRemoveCourse = document.getElementById('btn-remove-course');
    if (btnRemoveCourse) {
        btnRemoveCourse.addEventListener('click', async () => {
            if (!selectedNodeId) return;
            const node = nodesData.get(selectedNodeId);
            if (!node) return;

            const group = node.group;

            let totalYearCredits = 0;
            nodesData.get().forEach(n => {
                if (n.group === group && n.id !== selectedNodeId) {
                    if (n.credits) totalYearCredits += n.credits;
                }
            });

            // Hämta vilka kurser som kommer ryka
            let impactData = [];
            try {
                const res = await fetch(`/api/impact/${selectedNodeId}`);
                if (res.ok) {
                    const data = await res.json();
                    impactData = data.impacted;
                }
            } catch (e) { console.error("Could not fetch impact"); }

            let impactMsg = "";
            if (impactData.length > 0) {
                impactMsg = `\nFÖLJANDE KURSER SAKNAR DÅ BEHÖRIGHET (och markeras röda):\n${impactData.map(c => "- " + c.code + " (" + c.name + ")").join('\n')}\n\n`;
            }

            const proceed = confirm(`Är du säker på att du vill ta bort ${selectedNodeId} permanent?\n${impactMsg}\nOBS: År ${group} kommer då att ha ${totalYearCredits} hp (borde vara 60 hp).`);
            if (!proceed) return;

            btnRemoveCourse.disabled = true;
            btnRemoveCourse.textContent = "Tar bort...";

            try {
                const response = await fetch(`/api/course/${selectedNodeId}`, { method: 'DELETE' });
                if (response.ok) {
                    const data = await response.json();

                    document.getElementById('course-actions').style.display = 'none';
                    courseInfoPanel.innerHTML = '<div class="empty-state">Select a course in the graph to view details.</div>';

                    const replacePanel = document.getElementById('replace-course-panel');
                    if (replacePanel) replacePanel.style.display = 'none';

                    if (btnSimulate) {
                        btnSimulate.disabled = true;
                        btnSimulate.textContent = 'Select a course to simulate';
                    }

                    // Ta bort noden visuellt
                    nodesData.remove(selectedNodeId);
                    selectedNodeId = null;

                    // Markera påverkade röda
                    const updates = [];
                    data.impacted.forEach(course => {
                        const existingNode = nodesData.get(course.code);
                        if (existingNode) {
                            updates.push({
                                id: course.code,
                                color: { background: '#ef4444', border: '#991b1b' },
                                title: `Saknar behörighet! ${course.name}<br>Credits: ${existingNode.credits}<br>Period: ${existingNode.period}`
                            });
                        }
                    });
                    nodesData.update(updates);

                    const impactRes = document.getElementById('impact-results');
                    if (impactRes) {
                        impactRes.innerHTML = `
                            <div class="c-reqs" style="margin-top:16px; border-top: 1px solid rgba(239,68,68,0.3); padding-top: 16px;">
                                <h4 style="color:#f87171">Varning: Saknar behörighet</h4>
                                <ul class="c-req-list" style="margin-top: 8px;">
                                    ${data.impacted.map(c => `
                                        <li style="color:#fca5a5" onclick="selectGraphNode('${c.code}')">
                                            ${c.code} - ${c.name}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        `;
                    }
                } else {
                    alert('Kunde inte ta bort kursen.');
                }
            } catch (e) {
                alert('Nätverksfel vid borttagning.');
            } finally {
                btnRemoveCourse.disabled = false;
                btnRemoveCourse.textContent = "Permanently Remove Course";
            }
        });
    }

    initGraph();
});
