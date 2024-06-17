document.getElementById('process-files').addEventListener('click', async () => {
    const files = {
        columns: document.getElementById('columns-file').files[0],
        primaryKeys: document.getElementById('primary-keys-file').files[0],
        foreignKeys: document.getElementById('foreign-keys-file').files[0],
    };

    const data = {};
    for (const key in files) {
        if (files[key]) {
            data[key] = await readFile(files[key]);
        }
    }

    const originData = processOriginData(data);
    downloadJSON(originData, 'originData.json');
});

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result;
            const rows = text.split('\n').slice(1).filter(row => row.trim() !== ''); // Ignora a primeira linha (cabeçalho)
            resolve(rows.map(row => row.split(',').map(cell => cell.trim())));
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function processOriginData(data) {
    const originData = {};

    if (data.columns) {
        data.columns.forEach(row => {
            const [tableName, columnName, dataType, size, isNullable, isIdentity, defaultConstraint] = row;
            if (!originData[tableName]) {
                originData[tableName] = [];
            }
            originData[tableName].push({
                name: columnName,
                type: dataType,
                size: size,
                default: defaultConstraint || 'NULL',
                constraints: isNullable === '0' ? 'NOT NULL' : ''
            });
        });
    }

    if (data.primaryKeys) {
        const pkMap = {};
        data.primaryKeys.forEach(row => {
            const [tableName, columnName] = row;
            if (!pkMap[tableName]) {
                pkMap[tableName] = [];
            }
            pkMap[tableName].push(columnName);
        });

        for (const tableName in pkMap) {
            if (originData[tableName]) {
                originData[tableName].forEach(column => {
                    if (pkMap[tableName].includes(column.name)) {
                        column.constraints += (column.constraints ? ', ' : '') + 'PRIMARY KEY';
                    }
                });
            }
        }
    }

    if (data.foreignKeys) {
        const fkMap = {};
        data.foreignKeys.forEach(row => {
            const [fkName, parentTable, parentColumn, referencedTable, referencedColumn] = row;
            if (!fkMap[parentTable]) {
                fkMap[parentTable] = [];
            }
            fkMap[parentTable].push(parentColumn);
        });

        for (const tableName in fkMap) {
            if (originData[tableName]) {
                originData[tableName].forEach(column => {
                    if (fkMap[tableName].includes(column.name)) {
                        column.constraints += (column.constraints ? ', ' : '') + 'FOREIGN KEY';
                    }
                });
            }
        }
    }

    return originData;
}

function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
