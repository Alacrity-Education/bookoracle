import "./PrimaryButton.css";

interface Props{

    text:string;

    onClick:()=>void;

    disabled?:boolean;

}

function PrimaryButton({

    text,

    onClick,

    disabled=false

}:Props){

    return(

        <button

            className="primary-button"

            onClick={onClick}

            disabled={disabled}

        >

            {text}

        </button>

    );

}

export default PrimaryButton;