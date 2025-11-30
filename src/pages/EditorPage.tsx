import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import styled from 'styled-components';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

const EditorContainer = styled.div`
  display: flex;
  height: 100vh;
`;

const FileExplorer = styled.div`
  width: 200px;
  background-color: #252526;
  padding: 1rem;
  color: #cccccc;
`;

const CodeEditor = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden; 
`;

const EditorPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [code, setCode] = useState<string>(''); // Used ONLY for initial load
    
    const socketRef = useRef<WebSocket | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    
    // FLAG: Prevents the "Echo Loop"
    // (Server sends update -> Client updates editor -> Client triggers onChange -> Client sends back to Server)
    const isRemoteUpdate = useRef(false);

    // 1. Initial Fetch (HTTP)
    useEffect(() => {
        const fetchInitialCode = async () => {
            try {
                const response = await fetch(`http://localhost:8000/rooms/${roomId}`);
                const data = await response.json();
                setCode(data.content || ""); 
            } catch (error) {
                console.error('Error fetching initial code:', error);
            }
        };

        fetchInitialCode();
    }, [roomId]);

    // 2. WebSocket Logic
    useEffect(() => {
        // Small timeout to ensure browser is ready and avoid React Strict Mode double-connect issues
        const timeoutId = setTimeout(() => {
            if (socketRef.current) return;

            console.log("Attempting WebSocket connection...");
            const socket = new WebSocket(`ws://localhost:8000/ws/rooms/${roomId}`);
            
            socket.onopen = () => console.log("WebSocket Connected ✅");
            socket.onerror = (error) => console.error("WebSocket Error ❌", error);

            socket.onmessage = (event) => {
                const incomingCode = event.data;
                
                if (editorRef.current) {
                    const currentContent = editorRef.current.getValue();
                    
                    // Only update if the content is actually different
                    if (incomingCode !== currentContent) {
                        // 1. Turn on the flag: "This is a remote update, don't broadcast it back"
                        isRemoteUpdate.current = true;
                        
                        // 2. Save cursor position to minimize jumping
                        const position = editorRef.current.getPosition();
                        
                        // 3. Update Editor directly
                        editorRef.current.setValue(incomingCode);
                        
                        // 4. Restore cursor position
                        if (position) {
                            editorRef.current.setPosition(position);
                        }
                        
                        // 5. Turn off the flag
                        isRemoteUpdate.current = false;
                    }
                }
            };

            socketRef.current = socket;
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [roomId]);

    // 3. Editor Mount & Autocomplete Setup (Restored)
    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // Register the "Ghost Text" provider
        monacoInstance.languages.registerInlineCompletionsProvider('python', {
            provideInlineCompletions: async (model, position) => {
                const textUntilPosition = model.getValue();
                
                try {
                    const response = await fetch('http://localhost:8000/autocomplete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: textUntilPosition,
                            cursorPosition: model.getOffsetAt(position),
                            language: 'python',
                        }),
                    });

                    const data = await response.json();
                    
                    if (!data.suggestion) {
                        return { items: [] };
                    }

                    return {
                        items: [
                            {
                                insertText: data.suggestion,
                                range: new monacoInstance.Range(
                                    position.lineNumber,
                                    position.column,
                                    position.lineNumber,
                                    position.column + data.suggestion.length
                                ),
                            },
                        ],
                    };
                } catch (error) {
                    console.error('Autocomplete error:', error);
                    return { items: [] };
                }
            },
            // This satisfies the TypeScript interface requirement
            disposeInlineCompletions: () => {} 
        });
    };

    // 4. Handle Local Changes
    const handleEditorChange = (value: string | undefined) => {
        // Stop if this change came from the WebSocket
        if (isRemoteUpdate.current) {
            return;
        }

        const newCode = value || '';
        
        // Only send if socket is open
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(newCode);
        }
    };

    return (
        <EditorContainer>
            <FileExplorer>
                <h3>Files</h3>
            </FileExplorer>
            <CodeEditor>
                <Editor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    // KEY CHANGE: Use defaultValue, NOT value
                    defaultValue={code} 
                    onMount={handleEditorDidMount}
                    onChange={handleEditorChange}
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        inlineSuggest: { enabled: true },
                        quickSuggestions: false, 
                    }}
                />
            </CodeEditor>
        </EditorContainer>
    );
};

export default EditorPage;