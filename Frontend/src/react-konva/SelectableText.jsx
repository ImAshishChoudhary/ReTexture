import React, { useRef, useState, useEffect } from "react";
import { Text, Transformer, Rect } from "react-konva";
import { useKonvaSnapping } from "use-konva-snapping";

export default function SelectableText({ shape, selected, onSelect, onChange, stageRef}) {
    const ref = useRef();
    const trRef = useRef();
    const cursorRef = useRef();
    const [isEditing, setIsEditing] = useState(false);
    const [draftText, setDraftText] = useState(shape?.text || "");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [showCursor, setShowCursor] = useState(true);
    const editingIdRef = useRef(null);

        const { handleDragging, handleDragEnd } = useKonvaSnapping({
        snapRange: 5,
        guidelineColor: "blue",
        guidelineWidth: 1,
        guidelineDash: [4, 4],
        snapToStageCenter: true,
        snapToStageBorders: true,
        snapToShapes: true,
    });

    useEffect(() => {
        if (isEditing) {
            setCursorPosition(draftText.length);
            editingIdRef.current = shape?.id;
        } else {
            editingIdRef.current = null;
        }
    }, [isEditing, shape?.id]);

    useEffect(() => {
        if (!selected && isEditing) {
            setIsEditing(false);
            setCursorPosition(0);
            if (shape?.text !== draftText) {
                onChange({ ...shape, text: draftText });
            }
        }
    }, [selected, isEditing, shape, draftText, onChange]);

    useEffect(() => {
        let interval;
        if (isEditing) {
            interval = setInterval(() => {
                setShowCursor(prev => !prev);
            }, 500);
        } else {
            setShowCursor(false);
        }
        return () => clearInterval(interval);
    }, [isEditing]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isEditing || !ref.current || !selected) return;
            e.preventDefault();
            
            let newText = draftText;
            let newPos = cursorPosition;

            if (e.key === "Backspace") {
                if (cursorPosition > 0) {
                    newText = draftText.slice(0, cursorPosition - 1) + draftText.slice(cursorPosition);
                    newPos = cursorPosition - 1;
                }
            } else if (e.key === "Delete") {
                if (cursorPosition < draftText.length) {
                    newText = draftText.slice(0, cursorPosition) + draftText.slice(cursorPosition + 1);
                }
            } else if (e.key === "ArrowLeft") {
                newPos = Math.max(0, cursorPosition - 1);
                newText = draftText;
            } else if (e.key === "ArrowRight") {
                newPos = Math.min(draftText.length, cursorPosition + 1);
                newText = draftText;
            } else if (e.key === "Home") {
                newPos = 0;
                newText = draftText;
            } else if (e.key === "End") {
                newPos = draftText.length;
                newText = draftText;
            } else if (e.key === "Enter") {
                newText = draftText.slice(0, cursorPosition) + "\n" + draftText.slice(cursorPosition);
                newPos = cursorPosition + 1;
            } else if (e.key === "Escape") {
                commitEdit();
                return;
            } else if (e.key.length === 1) {
                newText = draftText.slice(0, cursorPosition) + e.key + draftText.slice(cursorPosition);
                newPos = cursorPosition + 1;
            } else {
                return;
            }
            
            setDraftText(newText);
            setCursorPosition(newPos);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditing, draftText, cursorPosition, selected]);

    const commitEdit = () => {
        if (!isEditing) return;
        setIsEditing(false);
        setCursorPosition(0);
        if (shape?.text !== draftText) {
            onChange({ ...shape, text: draftText });
        }
    };

    const getCursorX = () => {
        if (!ref.current || !isEditing) return 0;
        
        const textBeforeCursor = draftText.slice(0, cursorPosition);
        const lastLineBreak = textBeforeCursor.lastIndexOf('\n');
        const currentLineText = lastLineBreak >= 0 
            ? textBeforeCursor.slice(lastLineBreak + 1) 
            : textBeforeCursor;
        
        const context = document.createElement('canvas').getContext('2d');
        context.font = `${shape?.bold ? 'bold ' : ''}${shape?.italic ? 'italic ' : ''}${shape?.fontSize || 16}px ${shape?.fontFamily || 'Arial'}`;
        const width = context.measureText(currentLineText).width;
        
        return width;
    };

    const getCursorY = () => {
        if (!ref.current || !isEditing) return 0;
        
        const textBeforeCursor = draftText.slice(0, cursorPosition);
        const lineCount = (textBeforeCursor.match(/\n/g) || []).length;
        const fontSize = shape?.fontSize || 16;
        
        return lineCount * fontSize * 1.2;
    };

    useEffect(() => {
        if (selected && !isEditing && trRef.current && ref.current) {
            trRef.current.nodes([ref.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [selected, isEditing]);

    if (!shape) return null;


    useEffect(() => {
        if (ref.current) {
            ref.current.fill(shape.fill);
            ref.current.getLayer()?.batchDraw();
        }
    }, [shape?.fill]);


    useEffect(() => {
        if (ref.current && shape?.textTransform) {
            setDraftText((text) => {
                if (shape?.textTransform === "lowercase") return String(text)?.toLowerCase();
                if (shape?.textTransform === "uppercase") return String(text)?.toUpperCase();
                 if (shape?.textTransform === "none") return text;
                return text;
            });
        }
    }, [shape?.textTransform]);

    function isLocked(){
      if (shape?.locked) return; 
    }

    return (
        <>
            <Text
                ref={ref}
                {...shape}
                
                textDecoration={[
                    shape?.underline ? "underline" : "",
                    shape?.lineThrough ? "line-through" : "",
                ].join(" ")}

                fontStyle={`${shape?.bold ? "bold " : ""}${shape?.italic ? "italic" : ""}`}
                text={draftText}
                draggable={!isEditing===!shape?.locked}
                visible={shape?.visible}
                onMouseDown={(e) => {
                    if (shape?.locked) return;
                    if (isEditing) {
                        commitEdit();
                    }
                    onSelect(e);
                }}
                onTap={(e) => {
                    if (shape?.locked) return;
                    if (isEditing) {
                        commitEdit();
                    }
                    onSelect(e);
                }}
                onDblClick={() =>{
                    isLocked() 
                    setIsEditing(true)
                    }}
                onDblTap={() =>{
                    isLocked()
                     setIsEditing(true)
                     }}
                onDragMove={(e) => {
                      isLocked(); 
                    handleDragging(e);
                    e.target.position({ x: e.target.x(), y: e.target.y() });
                }}
                onDragEnd={(e) => {
                     isLocked(); 
                    commitEdit();
                    handleDragEnd(e)
                    onChange({ ...shape, x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={() => {
                    isLocked(); 
                    const node = ref.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    const rotation = node.rotation();

                    node.scaleX(1);
                    node.scaleY(1);

                    const width = Math.max(20, node.width() * scaleX);
                    const fontSize = Math.max(6, (shape?.fontSize || 16) * scaleY);

                    commitEdit();
                    onChange({
                        ...shape,
                        x: node.x(),
                        y: node.y(),
                        width: width,
                        fontSize: Math.round(fontSize),
                        rotation: Math.round(rotation),
                    });
                }}

                onMouseEnter={(e) => {
                      isLocked()
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "move";
                }}
                onMouseLeave={(e) => {
                    isLocked() 
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "default";
                }}
            />

            {isEditing && showCursor && selected && (
                <Rect
                    ref={cursorRef}
                    x={(shape?.x || 0) + getCursorX()}
                    y={(shape?.y || 0) + getCursorY()}
                    width={2}
                    height={shape?.fontSize || 16}
                    fill="#FF6B35"
                    listening={false}
                />
            )}

            {selected && !isEditing && (
                <Transformer
                    ref={trRef}
                    // rotateEnabled
                    enabledAnchors={[
                        "middle-left",
                        "middle-right",
                        
                        "top-center",
                        "bottom-center",

                        "top-left",
                        "top-right",
                        
                        "bottom-left",
                        "bottom-right",
                    ]}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 20 || newBox.height < 10) return oldBox;
                        newBox.width = newBox.width;
                        newBox.height = newBox.height;
                        return newBox;
                    }}
                    onTransformStart={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "nwse-resize";
                    }}
                    onTransformEnd={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "default";
                    }}
                />
            )}
        </>
    );
}