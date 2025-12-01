import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import styled from 'styled-components';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Read backend base URL from environment with a fallback for development
const BACKEND_BASE: string = (process.env.REACT_APP_BACKEND_URL as string) || 'http://localhost:8000';
const WS_BASE: string = BACKEND_BASE.replace(/^http/, 'ws');

// --- STYLES ---
const Layout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Segoe UI', sans-serif;
`;

const Header = styled.div`
  height: 35px;
  background-color: #333333;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  justify-content: space-between;
  border-bottom: 1px solid #252526;
`;

const MainArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 250px;
  background-color: #252526;
  border-right: 1px solid #1e1e1e;
  display: flex;
  flex-direction: column;
`;

const FileItem = styled.div<{ active: boolean }>`
  padding: 5px 15px;
  cursor: pointer;
  background-color: ${props => props.active ? '#37373d' : 'transparent'};
  color: ${props => props.active ? '#ffffff' : '#cccccc'};
  &:hover { background-color: #2a2d2e; }
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`;

const EditorWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Terminal = styled.div`
  height: 150px;
  background-color: #1e1e1e;
  border-top: 1px solid #333;
  padding: 10px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const Button = styled.button`
  background-color: #0e639c;
  color: white;
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  &:hover { background-color: #1177bb; }
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
`;

// --- TYPES ---
interface FileData {
    id: number;
    filename: string;
    content: string;
}

const EditorPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    
    // UI State
    const [files, setFiles] = useState<FileData[]>([]);
    const [activeFileId, setActiveFileId] = useState<number | null>(null);
    const [output, setOutput] = useState<string>('Terminal ready...');
    
    // REFS
    const filesRef = useRef<FileData[]>([]); 
    const activeFileIdRef = useRef<number | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const isRemoteUpdate = useRef(false);
    
    // NEW: Ref to track the autocomplete provider so we can clean it up
    const completionProviderRef = useRef<monaco.IDisposable | null>(null);

    // Helpers
    const updateFiles = (newFiles: FileData[]) => {
        filesRef.current = newFiles;
        setFiles(newFiles);
    };

    const updateActiveFileId = (id: number) => {
        activeFileIdRef.current = id;
        setActiveFileId(id);
    };

    // 1. Initial Load
    useEffect(() => {
        fetch(`${BACKEND_BASE}/rooms/${roomId}/files`)
            .then(res => res.json())
            .then((data: FileData[]) => {
                updateFiles(data);
                if (data.length > 0) {
                    updateActiveFileId(data[0].id);
                }
            });
    }, [roomId]);

    // 2. WebSocket Setup
    useEffect(() => {
        const socket = new WebSocket(`${WS_BASE}/ws/rooms/${roomId}`);
        socketRef.current = socket;

        socket.onopen = () => console.log("WebSocket Connected");

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === 'code') {
                const updatedFiles = filesRef.current.map(f => 
                    f.id === msg.fileId ? { ...f, content: msg.data } : f
                );
                updateFiles(updatedFiles);

                if (msg.fileId === activeFileIdRef.current) {
                    if (editorRef.current && editorRef.current.getValue() !== msg.data) {
                        isRemoteUpdate.current = true;
                        
                        const pos = editorRef.current.getPosition();
                        editorRef.current.setValue(msg.data);
                        if (pos) editorRef.current.setPosition(pos);
                        
                        isRemoteUpdate.current = false;
                    }
                }
            } 
            else if (msg.type === 'cursor' && msg.fileId === activeFileIdRef.current) {
                renderRemoteCursor(msg.position, msg.senderId);
            }
        };

        return () => {
            socket.close();
        };
    }, [roomId]);

    const renderRemoteCursor = (position: any, senderId: string) => {
        if (!editorRef.current || !monacoRef.current) return;
        
        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [{
            range: new monacoRef.current.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            options: {
                className: 'remote-cursor',
                hoverMessage: { value: `User ${senderId}` },
            }
        }];
        
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
    };

    const handleEditorChange = (value: string | undefined) => {
        if (isRemoteUpdate.current || !activeFileIdRef.current) return;
        
        const newContent = value || '';
        
        const updatedFiles = filesRef.current.map(f => 
            f.id === activeFileIdRef.current ? { ...f, content: newContent } : f
        );
        filesRef.current = updatedFiles;

        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'code',
                fileId: activeFileIdRef.current,
                data: newContent
            }));
        }
    };

    const handleRun = async () => {
        if (!activeFileIdRef.current) return;
        setOutput("Running...");
        
        const currentFile = filesRef.current.find(f => f.id === activeFileIdRef.current);
        if (!currentFile) return;

        try {
            const res = await fetch(`${BACKEND_BASE}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: currentFile.content })
            });
            const data = await res.json();
            setOutput(data.output);
        } catch (e) {
            setOutput("Error connecting to runner.");
        }
    };

    const handleSave = async () => {
        if (!activeFileIdRef.current) return;
        const currentFile = filesRef.current.find(f => f.id === activeFileIdRef.current);
        if (!currentFile) return;

        await fetch(`${BACKEND_BASE}/files/${currentFile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: currentFile.content })
        });
        alert('Saved!');
    };

    const handleNewFile = async () => {
        const name = prompt("File name:");
        if (name && roomId) {
            const res = await fetch(`${BACKEND_BASE}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: name, roomId })
            });
            const newFile = await res.json();
            
            const newFileList = [...filesRef.current, newFile];
            updateFiles(newFileList);
            updateActiveFileId(newFile.id);
        }
    };

    const handleFileClick = (id: number) => {
        if (editorRef.current && activeFileIdRef.current) {
            const currentContent = editorRef.current.getValue();
            const updatedFiles = filesRef.current.map(f => 
                f.id === activeFileIdRef.current ? { ...f, content: currentContent } : f
            );
            filesRef.current = updatedFiles;
        }
        updateActiveFileId(id);
    };

    // --- EDITOR MOUNT (Here is the Fix) ---
    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // 1. Dispose previous provider to avoid duplicates when switching files
        if (completionProviderRef.current) {
            completionProviderRef.current.dispose();
        }

        // 2. Register Autocomplete Provider
        completionProviderRef.current = monacoInstance.languages.registerInlineCompletionsProvider('python', {
            provideInlineCompletions: async (model, position) => {
                const textUntilPosition = model.getValue();
                
                try {
                    const response = await fetch(`${BACKEND_BASE}/autocomplete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: textUntilPosition,
                            cursorPosition: model.getOffsetAt(position),
                            language: 'python',
                        }),
                    });

                    const data = await response.json();
                    if (!data.suggestion) return { items: [] };

                    return {
                        items: [{
                            insertText: data.suggestion,
                            range: new monacoInstance.Range(
                                position.lineNumber,
                                position.column,
                                position.lineNumber,
                                position.column + data.suggestion.length
                            ),
                        }],
                    };
                } catch (error) {
                    return { items: [] };
                }
            },
            disposeInlineCompletions: () => {} 
        });

        // 3. Register Cursor Broadcasting
        editor.onDidChangeCursorPosition((e) => {
            if (socketRef.current?.readyState === WebSocket.OPEN && activeFileIdRef.current) {
                socketRef.current.send(JSON.stringify({
                    type: 'cursor',
                    fileId: activeFileIdRef.current,
                    position: e.position,
                    senderId: 'User' 
                }));
            }
        });
    };

    const activeFile = files.find(f => f.id === activeFileId);

    return (
        <Layout>
            <Header>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Code Collab-bro</span>
                <div style={{ display: 'flex' }}>
                    <Button onClick={handleRun} style={{background: '#2da042'}}>▶ Run</Button>
                    <Button onClick={handleSave} style={{background: '#007acc'}}>💾 Save</Button>
                </div>
            </Header>
            <MainArea>
                <Sidebar>
                    <div style={{ padding: '10px', fontSize: '11px', fontWeight: 'bold' }}>EXPLORER</div>
                    {files.map(file => (
                        <FileItem 
                            key={file.id} 
                            active={file.id === activeFileId}
                            onClick={() => handleFileClick(file.id)}
                        >
                            📄 {file.filename}
                        </FileItem>
                    ))}
                    <FileItem active={false} onClick={handleNewFile} style={{ color: '#007acc', marginTop: '10px' }}>
                        + New File
                    </FileItem>
                </Sidebar>
                <EditorWrapper>
                    {activeFile ? (
                        <Editor
                            key={activeFile.id} 
                            height="100%"
                            language="python"
                            theme="vs-dark"
                            path={activeFile.filename}
                            defaultValue={activeFile.content}
                            onMount={handleEditorDidMount}
                            onChange={handleEditorChange}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                automaticLayout: true,
                                inlineSuggest: { enabled: true }, // Ensure this is true
                            }}
                        />
                    ) : (
                        <div style={{ padding: '20px', color: '#666' }}>Select a file...</div>
                    )}
                </EditorWrapper>
            </MainArea>
            <Terminal>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>TERMINAL</div>
                {output}
            </Terminal>
        </Layout>
    );
};

export default EditorPage;