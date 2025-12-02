import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux';
import { Button, Tooltip } from 'antd';
import { LuUndo } from "react-icons/lu";
import { LuRedo } from "react-icons/lu";
import { setEditorPages } from '../redux/editorReducer';


export default function UndoRedo({ pushHistory, undoRedoRef }) {
    const dispatch = useDispatch();

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);
    const suppressPushRef = useRef(false);


    useEffect(() => {
        if (suppressPushRef?.current) return;
        try {
            const snap = JSON.parse(JSON.stringify(pushHistory));
            const h = historyRef?.current?.slice(0, historyIndexRef?.current + 1);
            h?.push(snap);
            historyRef.current = h;
            historyIndexRef.current = h?.length - 1;
            setCanUndo(historyIndexRef?.current > 0);
            setCanRedo(false);
        } catch (err) {
        }
    }, [pushHistory]);



    const undo = () => {
        if (historyIndexRef?.current <= 0) return;
        const newIndex = historyIndexRef?.current - 1;
        const snap = historyRef?.current[newIndex];
        historyIndexRef.current = newIndex;
        suppressPushRef.current = true;
        dispatch(setEditorPages(snap));
        setCanUndo(newIndex > 0);
        setCanRedo(true);
        setTimeout(() => (suppressPushRef.current = false), 0);
    };

    const redo = () => {
        if (historyIndexRef?.current >= historyRef?.current?.length - 1) return;
        const newIndex = historyIndexRef?.current + 1;
        const snap = historyRef?.current[newIndex];
        historyIndexRef.current = newIndex;
        suppressPushRef.current = true;
        dispatch(setEditorPages(snap));
        setCanUndo(true);
        setCanRedo(newIndex < historyRef?.current?.length - 1);
        setTimeout(() => (suppressPushRef.current = false), 0);
    };

    useEffect(() => {
        if (undoRedoRef) {
            undoRedoRef.current = { undo, redo, canUndo, canRedo };
        }
    }, [undoRedoRef, canUndo, canRedo]);

    return (
        <>
            <Tooltip title="Undo">
                <Button 
                    type='text' 
                    icon={<LuUndo size={18} />} 
                    onClick={undo} 
                    disabled={!canUndo}
                    style={{
                        border: "1px solid #e0e0e0",
                        color: canUndo ? "#1a1a1a" : "#d9d9d9",
                        borderRadius: 6
                    }}
                />
            </Tooltip>
            <Tooltip title="Redo">
                <Button 
                    type='text' 
                    icon={<LuRedo size={18} />} 
                    onClick={redo} 
                    disabled={!canRedo}
                    style={{
                        border: "1px solid #e0e0e0",
                        color: canRedo ? "#1a1a1a" : "#d9d9d9",
                        borderRadius: 6
                    }}
                />
            </Tooltip>

        </>
    )
}
